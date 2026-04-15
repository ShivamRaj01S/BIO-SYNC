import Match from '../models/Match.js';
import Request from '../models/Request.js';
import User from '../models/User.js';
import { isBloodCompatible, isOrganPreferenceCompatible } from '../utils/compatibility.js';
import { haversineKm } from '../utils/geo.js';
import { isPastWaitingPeriod } from './reliabilityService.js';
import { runMatchingForRequest } from './matchingService.js';

const INITIAL_RADIUS_KM = Number(process.env.INITIAL_RADIUS_KM) || 30;

function hasCoordinates(point) {
  return Array.isArray(point?.coordinates) && point.coordinates.length === 2;
}

function getActiveSearchRadiusKm(request) {
  return Number(request?.searchRadiusKm) > 0 ? Number(request.searchRadiusKm) : INITIAL_RADIUS_KM;
}

function canDonorParticipateNow(donor) {
  return Boolean(
    donor &&
      donor.role === 'donor' &&
      donor.status === 'active' &&
      donor.availabilityStatus === 'available' &&
      donor.bloodGroup &&
      hasCoordinates(donor.locationCoordinates)
  );
}

function isDonorEligibleForRequest(donor, request) {
  if (!canDonorParticipateNow(donor) || !hasCoordinates(request.locationCoordinates)) {
    return false;
  }

  if (!isBloodCompatible(donor.bloodGroup, request.bloodGroup)) {
    return false;
  }

  if (request.requiredType === 'organ') {
    if (!isOrganPreferenceCompatible(donor.organPreferences, request.organType)) {
      return false;
    }
  }

  if (!isPastWaitingPeriod(donor, request.requiredType)) {
    return false;
  }

  const distanceKm = haversineKm(
    donor.locationCoordinates.coordinates,
    request.locationCoordinates.coordinates
  );

  return Number.isFinite(distanceKm) && distanceKm <= getActiveSearchRadiusKm(request);
}

async function loadDonor(donorOrId) {
  if (donorOrId?._id) {
    return donorOrId;
  }

  return User.findById(donorOrId).select(
    'role status availabilityStatus bloodGroup organPreferences locationCoordinates lastDonationDate availabilityResetAt'
  );
}

async function requestHasOpenBatch(requestId) {
  const activeMatch = await Match.exists({
    request: requestId,
    status: 'notified',
    responseDueAt: { $gt: new Date() },
  });

  return Boolean(activeMatch);
}

export async function refreshPendingRequestsForDonor(donorOrId) {
  const donor = await loadDonor(donorOrId);

  if (!canDonorParticipateNow(donor)) {
    return {
      donorId: donor?._id?.toString?.() || null,
      processedRequests: 0,
      triggeredRequests: 0,
    };
  }

  const pendingRequests = await Request.find({
    status: 'pending',
    matchedDonorId: null,
  })
    .select('requiredType bloodGroup organType locationCoordinates searchRadiusKm createdAt')
    .sort({ createdAt: 1 });

  const triggeredRequestIds = [];

  for (const request of pendingRequests) {
    if (!isDonorEligibleForRequest(donor, request)) {
      continue;
    }

    if (await requestHasOpenBatch(request._id)) {
      continue;
    }

    await runMatchingForRequest(request._id);
    triggeredRequestIds.push(request._id.toString());
  }

  return {
    donorId: donor._id.toString(),
    processedRequests: pendingRequests.length,
    triggeredRequests: triggeredRequestIds.length,
    triggeredRequestIds,
  };
}

export async function refreshPendingRequestsForDonors(donorIds = []) {
  const results = [];

  for (const donorId of donorIds) {
    const result = await refreshPendingRequestsForDonor(donorId);
    results.push(result);
  }

  return {
    donorsProcessed: donorIds.length,
    triggeredRequests: results.reduce(
      (total, result) => total + Number(result.triggeredRequests || 0),
      0
    ),
    results,
  };
}
