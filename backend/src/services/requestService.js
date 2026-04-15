import Match from '../models/Match.js';
import HospitalProfile from '../models/HospitalProfile.js';
import Request from '../models/Request.js';
import { BLOOD_GROUPS, URGENCY_LEVELS } from '../utils/constants.js';
import { createHttpError } from '../utils/errors.js';
import { normalizePoint } from '../utils/geo.js';
import { logAuditEvent } from './auditService.js';
import { detectLocationMismatch } from './fraudService.js';
import { acceptMatch, declineMatch, runMatchingForRequest } from './matchingService.js';
import {
  penalizeLateCancellation,
  penalizeNoShow,
  rewardSuccessfulDonation,
} from './reliabilityService.js';
import { notifyDonationCompleted } from './notificationService.js';

async function getHospitalProfileForUser(hospitalUserId) {
  return HospitalProfile.findOne({ user: hospitalUserId }).populate(
    'user',
    'name email verified role'
  );
}

export async function createPatientBloodRequest({ user, payload, req }) {
  const { hospitalId, bloodGroup, urgencyLevel, locationCoordinates, address, notes, requiredUnits } =
    payload;

  if (!hospitalId || !bloodGroup) {
    throw createHttpError(400, 'hospitalId and bloodGroup are required.');
  }

  if (!BLOOD_GROUPS.includes(bloodGroup)) {
    throw createHttpError(400, 'A valid blood group is required.');
  }

  if (urgencyLevel && !URGENCY_LEVELS.includes(urgencyLevel)) {
    throw createHttpError(400, 'Invalid urgency level.');
  }

  const hospitalProfile = await HospitalProfile.findById(hospitalId).populate(
    'user',
    'verified email name'
  );

  if (!hospitalProfile) {
    throw createHttpError(404, 'Hospital not found.');
  }

  if (hospitalProfile.verificationStatus !== 'verified' || !hospitalProfile.user?.verified) {
    throw createHttpError(403, 'Requests can only be routed to verified hospitals.');
  }

  const normalizedPoint =
    normalizePoint(locationCoordinates) ||
    normalizePoint(hospitalProfile.location) ||
    normalizePoint(user.locationCoordinates);

  if (!normalizedPoint) {
    throw createHttpError(400, 'A valid request location is required.');
  }

  const request = await Request.create({
    requesterId: user._id,
    requesterRole: 'patient',
    patientId: user._id,
    hospitalId: hospitalProfile._id,
    requiredType: 'blood',
    bloodGroup,
    urgencyLevel: urgencyLevel || 'medium',
    locationCoordinates: normalizedPoint,
    address: address || hospitalProfile.address,
    notes: notes || '',
    requiredUnits: requiredUnits || 1,
  });

  const mismatchResult = await detectLocationMismatch({
    userId: user._id,
    expectedPoint: normalizedPoint,
    referencePoint: user.locationCoordinates,
    context: 'patient_blood_request',
    req,
  });

  if (mismatchResult.flagged) {
    request.fraudReviewRequired = true;
    await request.save();
  }

  await logAuditEvent({
    userId: user._id,
    action: 'REQUEST_CREATED',
    resource: 'Request',
    resourceId: request._id,
    details: {
      requiredType: 'blood',
      urgencyLevel: request.urgencyLevel,
      hospitalId: hospitalProfile._id,
      fraudReviewRequired: request.fraudReviewRequired,
    },
    req,
  });

  await runMatchingForRequest(request._id);
  return request;
}

export async function createHospitalOrganRequest({ user, payload, req }) {
  const { bloodGroup, organType, urgencyLevel, locationCoordinates, address, notes, requiredUnits } =
    payload;

  if (!user.verified) {
    throw createHttpError(403, 'Only verified hospitals can create organ donation requests.');
  }

  if (!organType || !bloodGroup) {
    throw createHttpError(400, 'bloodGroup and organType are required for organ requests.');
  }

  if (!BLOOD_GROUPS.includes(bloodGroup)) {
    throw createHttpError(400, 'A valid blood group is required.');
  }

  if (urgencyLevel && !URGENCY_LEVELS.includes(urgencyLevel)) {
    throw createHttpError(400, 'Invalid urgency level.');
  }

  const hospitalProfile = await getHospitalProfileForUser(user._id);
  if (!hospitalProfile) {
    throw createHttpError(404, 'Hospital profile not found.');
  }

  if (hospitalProfile.verificationStatus !== 'verified') {
    throw createHttpError(403, 'Hospital verification is still pending.');
  }

  const normalizedPoint =
    normalizePoint(locationCoordinates) ||
    normalizePoint(hospitalProfile.location) ||
    normalizePoint(user.locationCoordinates);

  if (!normalizedPoint) {
    throw createHttpError(400, 'A valid request location is required.');
  }

  const request = await Request.create({
    requesterId: user._id,
    requesterRole: 'hospital',
    patientId: payload.patientId || null,
    hospitalId: hospitalProfile._id,
    requiredType: 'organ',
    bloodGroup,
    organType,
    urgencyLevel: urgencyLevel || 'critical',
    locationCoordinates: normalizedPoint,
    address: address || hospitalProfile.address,
    notes: notes || '',
    requiredUnits: requiredUnits || 1,
  });

  const mismatchResult = await detectLocationMismatch({
    userId: user._id,
    expectedPoint: normalizedPoint,
    referencePoint: hospitalProfile.location || user.locationCoordinates,
    context: 'hospital_organ_request',
    req,
  });

  if (mismatchResult.flagged) {
    request.fraudReviewRequired = true;
    await request.save();
  }

  await logAuditEvent({
    userId: user._id,
    action: 'REQUEST_CREATED',
    resource: 'Request',
    resourceId: request._id,
    details: {
      requiredType: 'organ',
      urgencyLevel: request.urgencyLevel,
      hospitalId: hospitalProfile._id,
      fraudReviewRequired: request.fraudReviewRequired,
    },
    req,
  });

  await runMatchingForRequest(request._id);
  return request;
}

export async function completeDonation({ hospitalUser, requestId, payload, req }) {
  const hospitalProfile = await getHospitalProfileForUser(hospitalUser._id);
  if (!hospitalProfile) {
    throw createHttpError(404, 'Hospital profile not found.');
  }

  if (!hospitalUser.verified || hospitalProfile.verificationStatus !== 'verified') {
    throw createHttpError(403, 'Only verified hospitals can confirm donation completion.');
  }

  const request = await Request.findOne({
    _id: requestId,
    hospitalId: hospitalProfile._id,
  })
    .populate('requesterId', 'name email role')
    .populate('patientId', 'name email role')
    .populate('matchedDonorId', 'name email role');

  if (!request) {
    throw createHttpError(404, 'Request not found.');
  }

  if (request.status !== 'matched') {
    throw createHttpError(400, 'Only matched requests can be completed.');
  }

  const wasSuccessful = Boolean(payload.success);
  if (wasSuccessful) {
    request.status = 'completed';
    request.completedAt = new Date();
    request.cancellationReason = '';
    await request.save();

    if (request.matchedDonorId?._id) {
      await rewardSuccessfulDonation(request.matchedDonorId._id, request, req);
    }
  } else {
    request.status = 'cancelled';
    request.cancelledAt = new Date();
    request.cancellationReason = payload.reason || 'Hospital cancelled the request.';
    await request.save();

    if (request.matchedDonorId?._id) {
      if (payload.outcome === 'late_cancellation') {
        await penalizeLateCancellation(
          request.matchedDonorId._id,
          { requestId: request._id, reason: request.cancellationReason },
          req
        );
      } else if (payload.outcome === 'no_show') {
        await penalizeNoShow(
          request.matchedDonorId._id,
          { requestId: request._id, reason: request.cancellationReason },
          req
        );
      }
    }
  }

  await notifyDonationCompleted({
    request,
    requester: request.requesterId,
    patient: request.patientId,
    donor: request.matchedDonorId,
    success: wasSuccessful,
  });

  await logAuditEvent({
    userId: hospitalUser._id,
    action: 'DONATION_COMPLETION_CONFIRMED',
    resource: 'Request',
    resourceId: request._id,
    details: {
      success: wasSuccessful,
      outcome: payload.outcome || null,
      cancellationReason: request.cancellationReason,
    },
    req,
  });

  return request;
}

export async function handleDonorResponse({ donorId, matchId, action, req }) {
  const normalizedAction = action === 'reject' ? 'decline' : action;

  if (!['accept', 'decline'].includes(normalizedAction)) {
    throw createHttpError(400, 'Response action must be accept or decline.');
  }

  return normalizedAction === 'accept'
    ? acceptMatch({ donorId, matchId, req })
    : declineMatch({ donorId, matchId, req });
}

export async function getHospitalRequestDetails(hospitalUserId) {
  const hospitalProfile = await getHospitalProfileForUser(hospitalUserId);
  if (!hospitalProfile) {
    throw createHttpError(404, 'Hospital profile not found.');
  }

  const requests = await Request.find({ hospitalId: hospitalProfile._id })
    .populate('requesterId', 'name email role')
    .populate('patientId', 'name email role')
    .populate('matchedDonorId', 'name email role reliabilityScore availabilityStatus')
    .sort({ createdAt: -1 });

  const matches = await Match.find({ request: { $in: requests.map((request) => request._id) } })
    .populate('donor', 'name email reliabilityScore availabilityStatus bloodGroup')
    .sort({ score: -1, createdAt: 1 });

  const matchesByRequestId = matches.reduce((accumulator, match) => {
    const key = match.request.toString();
    if (!accumulator.has(key)) {
      accumulator.set(key, []);
    }
    accumulator.get(key).push(match);
    return accumulator;
  }, new Map());

  return requests.map((request) => ({
    request,
    matches: matchesByRequestId.get(request._id.toString()) || [],
  }));
}
