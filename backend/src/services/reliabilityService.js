import User from '../models/User.js';
import DonorProfile from '../models/DonorProfile.js';
import { addDays } from '../utils/geo.js';
import { logAuditEvent } from './auditService.js';

const BLOOD_WAITING_PERIOD_DAYS = Number(process.env.BLOOD_WAITING_PERIOD_DAYS) || 56;
const ORGAN_WAITING_PERIOD_DAYS = Number(process.env.ORGAN_WAITING_PERIOD_DAYS) || 180;

function clampReliability(value) {
  return Math.max(0, Math.min(100, value));
}

export function getMandatoryWaitingPeriodDays(requiredType = 'blood') {
  return requiredType === 'organ' ? ORGAN_WAITING_PERIOD_DAYS : BLOOD_WAITING_PERIOD_DAYS;
}

export function isPastWaitingPeriod(user, requiredType = 'blood') {
  if (!user?.lastDonationDate) {
    return true;
  }

  const nextEligibleDate =
    user.availabilityResetAt || addDays(user.lastDonationDate, getMandatoryWaitingPeriodDays(requiredType));

  return new Date(nextEligibleDate) <= new Date();
}

async function adjustReliability({
  donorId,
  delta,
  counters = {},
  reason,
  details = {},
  req = null,
}) {
  const donor = await User.findById(donorId);
  if (!donor) {
    return null;
  }

  donor.reliabilityScore = clampReliability((donor.reliabilityScore ?? 100) + delta);

  Object.entries(counters).forEach(([field, incrementBy]) => {
    donor[field] = Number(donor[field] || 0) + incrementBy;
  });

  await donor.save();

  await logAuditEvent({
    userId: donorId,
    action: 'RELIABILITY_UPDATED',
    resource: 'User',
    resourceId: donorId,
    details: {
      reason,
      delta,
      updatedReliabilityScore: donor.reliabilityScore,
      ...details,
    },
    severity: delta < 0 ? 'warning' : 'info',
    req,
  });

  return donor;
}

export async function rewardSuccessfulDonation(donorId, request, req = null) {
  const waitDays = getMandatoryWaitingPeriodDays(request.requiredType);
  const now = new Date();
  const availabilityResetAt = addDays(now, waitDays);

  const donor = await User.findById(donorId);
  if (!donor) {
    return null;
  }

  donor.successfulDonations = Number(donor.successfulDonations || 0) + 1;
  donor.reliabilityScore = clampReliability((donor.reliabilityScore ?? 100) + 5);
  donor.lastDonationDate = now;
  donor.lastDonationType = request.requiredType;
  donor.availabilityStatus = 'busy';
  donor.availabilityResetAt = availabilityResetAt;
  await donor.save();

  await DonorProfile.findOneAndUpdate(
    { user: donorId },
    {
      $set: {
        availability: 'BUSY',
        reliabilityScore: donor.reliabilityScore,
        lastDonationDate: donor.lastDonationDate,
      },
    }
  );

  await logAuditEvent({
    userId: donorId,
    action: 'DONATION_RECORDED',
    resource: 'Request',
    resourceId: request._id,
    details: {
      requestType: request.requiredType,
      reliabilityScore: donor.reliabilityScore,
      availabilityResetAt,
    },
    req,
  });

  return donor;
}

export async function penalizeSlowResponse(donorId, details = {}, req = null) {
  return adjustReliability({
    donorId,
    delta: -4,
    counters: { slowResponseCount: 1 },
    reason: 'slow_response',
    details,
    req,
  });
}

export async function penalizeNoShow(donorId, details = {}, req = null) {
  return adjustReliability({
    donorId,
    delta: -12,
    counters: { noShowCount: 1 },
    reason: 'no_show',
    details,
    req,
  });
}

export async function penalizeLateCancellation(donorId, details = {}, req = null) {
  return adjustReliability({
    donorId,
    delta: -8,
    counters: { lateCancellationCount: 1 },
    reason: 'late_cancellation',
    details,
    req,
  });
}

export async function resetBusyDonorsAfterWaitingPeriod() {
  const now = new Date();
  const donors = await User.find({
    role: 'donor',
    availabilityStatus: 'busy',
    availabilityResetAt: { $lte: now },
  }).select('_id');

  const donorIds = donors.map((donor) => donor._id);

  if (!donorIds.length) {
    return [];
  }

  await User.updateMany(
    { _id: { $in: donorIds } },
    {
      $set: {
        availabilityStatus: 'available',
        availabilityResetAt: null,
      },
    }
  );

  await DonorProfile.updateMany(
    { user: { $in: donorIds } },
    {
      $set: {
        availability: 'AVAILABLE',
      },
    }
  );

  return donorIds;
}
