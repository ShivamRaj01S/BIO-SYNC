import HospitalProfile from '../models/HospitalProfile.js';
import User from '../models/User.js';
import { haversineKm, normalizePoint } from '../utils/geo.js';
import { logAuditEvent } from './auditService.js';

const LOCATION_MISMATCH_THRESHOLD_KM = Number(process.env.LOCATION_MISMATCH_THRESHOLD_KM) || 250;

async function appendFlagIfMissing(userId, flag, req) {
  const user = await User.findById(userId).select('flags');
  if (!user) {
    return null;
  }

  const duplicate = user.flags.find(
    (existingFlag) =>
      existingFlag.type === flag.type &&
      existingFlag.reason === flag.reason &&
      existingFlag.status === 'open'
  );

  if (!duplicate) {
    user.flags.push(flag);
    await user.save();
  }

  await logAuditEvent({
    userId,
    action: 'USER_FLAGGED',
    resource: 'User',
    resourceId: userId,
    details: flag,
    severity: flag.severity === 'high' ? 'critical' : 'warning',
    req,
  });

  return user;
}

export async function flagUserForReview(userId, flag, req) {
  if (!userId) {
    return null;
  }

  return appendFlagIfMissing(userId, flag, req);
}

export async function detectDuplicateAccountRisk({
  userId = null,
  email,
  googleId,
  phone,
  registrationNumber,
  req,
}) {
  const flags = [];

  if (email) {
    const existingEmail = await User.findOne({
      email,
      ...(userId ? { _id: { $ne: userId } } : {}),
    }).select('_id');

    if (existingEmail) {
      flags.push({
        type: 'duplicate_account',
        reason: `Email ${email} is already associated with another account.`,
        severity: 'high',
        metadata: { conflictingUserId: existingEmail._id, email },
      });
    }
  }

  if (googleId) {
    const existingGoogleId = await User.findOne({
      googleId,
      ...(userId ? { _id: { $ne: userId } } : {}),
    }).select('_id');

    if (existingGoogleId) {
      flags.push({
        type: 'duplicate_account',
        reason: 'Google identity is already linked to another account.',
        severity: 'high',
        metadata: { conflictingUserId: existingGoogleId._id },
      });
    }
  }

  if (phone) {
    const existingPhone = await User.findOne({
      phone,
      ...(userId ? { _id: { $ne: userId } } : {}),
    }).select('_id');

    if (existingPhone) {
      flags.push({
        type: 'duplicate_account',
        reason: `Phone number ${phone} is shared across multiple accounts.`,
        severity: 'medium',
        metadata: { conflictingUserId: existingPhone._id, phone },
      });
    }
  }

  if (registrationNumber) {
    const existingRegistration = await HospitalProfile.findOne({
      registrationNumber,
    }).select('_id user');

    if (
      existingRegistration &&
      (!userId || existingRegistration.user.toString() !== userId.toString())
    ) {
      flags.push({
        type: 'duplicate_account',
        reason: `Hospital registration number ${registrationNumber} already exists.`,
        severity: 'high',
        metadata: {
          conflictingHospitalProfileId: existingRegistration._id,
          conflictingUserId: existingRegistration.user,
          registrationNumber,
        },
      });
    }
  }

  for (const flag of flags) {
    await flagUserForReview(userId, flag, req);
  }

  return flags;
}

export async function detectLocationMismatch({
  userId,
  expectedPoint,
  referencePoint = null,
  context = 'request',
  req,
}) {
  const normalizedExpected = normalizePoint(expectedPoint);
  const normalizedReference = normalizePoint(referencePoint) || req?.requestContext?.clientPoint;

  if (!normalizedExpected || !normalizedReference) {
    return { flagged: false, distanceKm: null };
  }

  const distanceKm = haversineKm(
    normalizedExpected.coordinates,
    normalizedReference.coordinates
  );

  if (distanceKm <= LOCATION_MISMATCH_THRESHOLD_KM) {
    return { flagged: false, distanceKm };
  }

  await flagUserForReview(
    userId,
    {
      type: 'location_mismatch',
      reason: `Location mismatch detected for ${context}.`,
      severity: 'medium',
      metadata: {
        context,
        expectedPoint: normalizedExpected.coordinates,
        referencePoint: normalizedReference.coordinates,
        distanceKm: Number(distanceKm.toFixed(2)),
      },
    },
    req
  );

  return { flagged: true, distanceKm };
}
