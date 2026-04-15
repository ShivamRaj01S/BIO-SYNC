import Match from '../models/Match.js';
import Request from '../models/Request.js';
import User from '../models/User.js';
import { isBloodCompatible, isOrganPreferenceCompatible } from '../utils/compatibility.js';
import { createHttpError } from '../utils/errors.js';
import { calculateMatchScore } from '../utils/scoring.js';
import { logAuditEvent } from './auditService.js';
import { notifyDonorShortlisted, notifyMatchAccepted } from './notificationService.js';
import { isPastWaitingPeriod, penalizeSlowResponse } from './reliabilityService.js';

const INITIAL_RADIUS_KM = Number(process.env.INITIAL_RADIUS_KM) || 30;
const MAX_RADIUS_KM = Number(process.env.MAX_RADIUS_KM) || 250;
const ESCALATION_RADIUS_STEP_KM = Number(process.env.ESCALATION_RADIUS_STEP_KM) || 25;
const TOP_DONORS_TO_NOTIFY = Number(process.env.TOP_DONORS_TO_NOTIFY) || 3;
const CRITICAL_BATCH_SIZE = Number(process.env.CRITICAL_ESCALATION_BATCH_SIZE) || 5;
const RESPONSE_TIMEOUT_MINUTES = Number(process.env.RESPONSE_TIMEOUT_MINUTES) || 15;
const CRITICAL_RESPONSE_TIMEOUT_MINUTES =
  Number(process.env.CRITICAL_RESPONSE_TIMEOUT_MINUTES) || 7;

function getResponseTimeoutMinutes(urgencyLevel) {
  return urgencyLevel === 'critical'
    ? CRITICAL_RESPONSE_TIMEOUT_MINUTES
    : RESPONSE_TIMEOUT_MINUTES;
}

function getEscalationStepKm(urgencyLevel) {
  return urgencyLevel === 'critical'
    ? ESCALATION_RADIUS_STEP_KM * 2
    : ESCALATION_RADIUS_STEP_KM;
}

async function loadRequestContext(requestId) {
  return Request.findById(requestId)
    .populate('requesterId', 'name email role')
    .populate('patientId', 'name email role')
    .populate({
      path: 'hospitalId',
      populate: {
        path: 'user',
        select: 'name email verified role',
      },
    })
    .populate('matchedDonorId', 'name email role');
}

export async function findEligibleDonors(request, radiusKm) {
  const allowBusyDonors = request.urgencyLevel === 'critical';

  const donors = await User.aggregate([
    {
      $geoNear: {
        near: request.locationCoordinates,
        distanceField: 'distanceMeters',
        spherical: true,
        maxDistance: radiusKm * 1000,
        query: {
          role: 'donor',
          status: 'active',
          bloodGroup: { $ne: null },
          availabilityStatus: allowBusyDonors ? { $in: ['available', 'busy'] } : 'available',
        },
      },
    },
    {
      $project: {
        email: 1,
        name: 1,
        picture: 1,
        bloodGroup: 1,
        organPreferences: 1,
        availabilityStatus: 1,
        reliabilityScore: 1,
        lastDonationDate: 1,
        availabilityResetAt: 1,
        distanceMeters: 1,
      },
    },
  ]);

  return donors
    .filter((donor) => {
      if (!isBloodCompatible(donor.bloodGroup, request.bloodGroup)) {
        return false;
      }

      if (request.requiredType === 'organ') {
        return isOrganPreferenceCompatible(donor.organPreferences, request.organType);
      }

      return true;
    })
    .filter((donor) => isPastWaitingPeriod(donor, request.requiredType))
    .map((donor) => ({
      ...donor,
      distanceKm: Number(((donor.distanceMeters || 0) / 1000).toFixed(2)),
    }));
}

async function expireTimedOutMatches(requestId) {
  const staleMatches = await Match.find({
    request: requestId,
    status: 'notified',
    responseDueAt: { $lte: new Date() },
  });

  for (const match of staleMatches) {
    match.status = 'expired';
    match.respondedAt = new Date();
    await match.save();
    await penalizeSlowResponse(match.donor, { requestId }, null);
  }
}

async function notifyNextBatch(request, radiusKm, batchSize = TOP_DONORS_TO_NOTIFY) {
  const existingMatches = await Match.find({ request: request._id }).select(
    'donor batchNumber rank status'
  );
  const excludedDonorIds = new Set(existingMatches.map((match) => match.donor.toString()));
  const eligibleDonors = await findEligibleDonors(request, radiusKm);

  const rankedDonors = eligibleDonors
    .map((donor) => {
      const score = calculateMatchScore({
        donor,
        request,
        distanceKm: donor.distanceKm,
        radiusKm,
      });

      return {
        donor,
        score: score.total,
        scoreBreakdown: score.breakdown,
      };
    })
    .sort((left, right) => right.score - left.score);

  const nextBatch = rankedDonors
    .filter((entry) => !excludedDonorIds.has(entry.donor._id.toString()))
    .slice(0, batchSize);

  if (!nextBatch.length) {
    return [];
  }

  const nextBatchNumber =
    existingMatches.length > 0
      ? Math.max(...existingMatches.map((match) => match.batchNumber || 1)) + 1
      : 1;
  const currentRankOffset =
    existingMatches.length > 0 ? Math.max(...existingMatches.map((match) => match.rank || 0)) : 0;
  const responseDueAt = new Date(
    Date.now() + getResponseTimeoutMinutes(request.urgencyLevel) * 60 * 1000
  );

  const createdMatches = [];
  for (let index = 0; index < nextBatch.length; index += 1) {
    const entry = nextBatch[index];
    const match = await Match.create({
      request: request._id,
      donor: entry.donor._id,
      score: entry.score,
      scoreBreakdown: entry.scoreBreakdown,
      distanceKm: entry.donor.distanceKm,
      rank: currentRankOffset + index + 1,
      batchNumber: nextBatchNumber,
      responseDueAt,
    });

    await notifyDonorShortlisted({
      donor: entry.donor,
      request,
      match,
    });

    createdMatches.push(match);
  }

  return createdMatches;
}

export async function runMatchingForRequest(requestId) {
  const request = await loadRequestContext(requestId);
  if (!request || request.status !== 'pending' || request.matchedDonorId) {
    return null;
  }

  await expireTimedOutMatches(request._id);

  const radiusKm = request.searchRadiusKm || INITIAL_RADIUS_KM;
  const batchSize = request.urgencyLevel === 'critical' ? CRITICAL_BATCH_SIZE : TOP_DONORS_TO_NOTIFY;
  const createdMatches = await notifyNextBatch(request, radiusKm, batchSize);

  if (createdMatches.length) {
    request.searchRadiusKm = radiusKm;
    request.lastNotifiedAt = new Date();
    request.nextEscalationAt = new Date(
      Date.now() + getResponseTimeoutMinutes(request.urgencyLevel) * 60 * 1000
    );
    await request.save();

    await logAuditEvent({
      userId: request.requesterId?._id || null,
      action: 'MATCH_BATCH_CREATED',
      resource: 'Request',
      resourceId: request._id,
      details: {
        radiusKm,
        batchSize: createdMatches.length,
        urgencyLevel: request.urgencyLevel,
      },
    });
  } else if (radiusKm >= MAX_RADIUS_KM) {
    request.nextEscalationAt = null;
    await request.save();
  } else {
    request.nextEscalationAt = new Date(
      Date.now() + getResponseTimeoutMinutes(request.urgencyLevel) * 60 * 1000
    );
    await request.save();
  }

  return createdMatches;
}

export async function escalateRequest(requestId) {
  const request = await loadRequestContext(requestId);
  if (!request || request.status !== 'pending' || request.matchedDonorId) {
    return null;
  }

  await expireTimedOutMatches(request._id);

  const nextRadiusKm = Math.min(
    (request.searchRadiusKm || INITIAL_RADIUS_KM) + getEscalationStepKm(request.urgencyLevel),
    MAX_RADIUS_KM
  );

  request.searchRadiusKm = nextRadiusKm;
  request.escalationLevel = Number(request.escalationLevel || 0) + 1;
  await request.save();

  const batchSize =
    request.urgencyLevel === 'critical' ? CRITICAL_BATCH_SIZE : TOP_DONORS_TO_NOTIFY;
  const createdMatches = await notifyNextBatch(request, nextRadiusKm, batchSize);
  request.lastNotifiedAt = createdMatches.length ? new Date() : request.lastNotifiedAt;
  request.nextEscalationAt =
    createdMatches.length || nextRadiusKm < MAX_RADIUS_KM
      ? new Date(Date.now() + getResponseTimeoutMinutes(request.urgencyLevel) * 60 * 1000)
      : null;
  await request.save();

  await logAuditEvent({
    userId: request.requesterId?._id || null,
    action: 'REQUEST_ESCALATED',
    resource: 'Request',
    resourceId: request._id,
    details: {
      radiusKm: nextRadiusKm,
      escalationLevel: request.escalationLevel,
      notifiedDonors: createdMatches.length,
    },
  });

  return createdMatches;
}

export async function processPendingEscalations() {
  const pendingRequests = await Request.find({
    status: 'pending',
    matchedDonorId: null,
    nextEscalationAt: { $lte: new Date() },
  }).select('_id');

  for (const request of pendingRequests) {
    await escalateRequest(request._id);
  }

  return pendingRequests.length;
}

export async function acceptMatch({ matchId, donorId, req }) {
  const match = await Match.findOne({ _id: matchId, donor: donorId }).populate('request');
  if (!match) {
    throw createHttpError(404, 'Matching record not found.');
  }

  if (match.status !== 'notified') {
    throw createHttpError(400, 'This match has already been handled.');
  }

  const request = await loadRequestContext(match.request._id);
  if (!request || request.status !== 'pending' || request.matchedDonorId) {
    throw createHttpError(400, 'The request is no longer accepting donor responses.');
  }

  const donor = await User.findById(donorId).select(
    'name email reliabilityScore availabilityStatus bloodGroup'
  );
  if (!donor) {
    throw createHttpError(404, 'Donor account not found.');
  }

  match.status = 'accepted';
  match.respondedAt = new Date();
  await match.save();

  request.status = 'matched';
  request.matchedDonorId = donorId;
  request.matchedAt = new Date();
  request.nextEscalationAt = null;
  await request.save();

  await Match.updateMany(
    { request: request._id, _id: { $ne: match._id }, status: 'notified' },
    { $set: { status: 'cancelled', respondedAt: new Date() } }
  );

  await notifyMatchAccepted({
    request,
    donor,
    requester: request.requesterId,
    patient: request.patientId,
    hospitalUser: request.hospitalId?.user,
  });

  await logAuditEvent({
    userId: donorId,
    action: 'DONOR_ACCEPTED_MATCH',
    resource: 'Match',
    resourceId: match._id,
    details: {
      requestId: request._id,
      score: match.score,
    },
    req,
  });

  return { match, request, donor };
}

export async function declineMatch({ matchId, donorId, req }) {
  const match = await Match.findOne({ _id: matchId, donor: donorId }).populate('request');
  if (!match) {
    throw createHttpError(404, 'Matching record not found.');
  }

  if (match.status !== 'notified') {
    throw createHttpError(400, 'This match has already been handled.');
  }

  match.status = 'declined';
  match.respondedAt = new Date();
  await match.save();

  await logAuditEvent({
    userId: donorId,
    action: 'DONOR_DECLINED_MATCH',
    resource: 'Match',
    resourceId: match._id,
    details: {
      requestId: match.request._id,
    },
    req,
  });

  const request = await Request.findById(match.request._id).select('_id status nextEscalationAt');
  if (request?.status === 'pending') {
    request.nextEscalationAt = new Date();
    await request.save();
  }

  return match;
}
