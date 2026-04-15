import Notification from '../models/Notification.js';
import Match from '../models/Match.js';
import DonorProfile from '../models/DonorProfile.js';
import User from '../models/User.js';
import { BLOOD_GROUPS, AVAILABILITY_STATUS } from '../utils/constants.js';
import { createHttpError } from '../utils/errors.js';
import { logAuditEvent } from '../services/auditService.js';
import { detectDuplicateAccountRisk, detectLocationMismatch } from '../services/fraudService.js';
import { hydrateUserWithLegacyProfile, saveDonorProfile } from '../services/profileService.js';
import { refreshPendingRequestsForDonor } from '../services/reactiveMatchingService.js';
import { handleDonorResponse } from '../services/requestService.js';
import { normalizePoint } from '../utils/geo.js';

function buildDonorPayload(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    picture: user.picture,
    bloodGroup: user.bloodGroup,
    organPreferences: user.organPreferences || [],
    availabilityStatus: user.availabilityStatus,
    reliabilityScore: user.reliabilityScore,
    successfulDonations: user.successfulDonations || 0,
    lastDonationDate: user.lastDonationDate,
    locationCoordinates: user.locationCoordinates || null,
    address: user.address || '',
    phone: user.phone || '',
  };
}

export async function getDashboard(req, res) {
  const hydrated = await hydrateUserWithLegacyProfile(req.user._id);
  const donor = hydrated.user || req.user;

  const incomingMatches = await Match.find({ donor: donor._id, status: 'notified' })
    .populate({
      path: 'request',
      populate: [
        { path: 'requesterId', select: 'name email role' },
        { path: 'patientId', select: 'name email role' },
        {
          path: 'hospitalId',
          populate: {
            path: 'user',
            select: 'name email verified',
          },
        },
      ],
    })
    .sort({ createdAt: -1 });

  const history = await Match.find({ donor: donor._id, status: { $in: ['accepted', 'declined', 'expired'] } })
    .populate({
      path: 'request',
      populate: [
        { path: 'requesterId', select: 'name email role' },
        { path: 'patientId', select: 'name email role' },
        {
          path: 'hospitalId',
          populate: {
            path: 'user',
            select: 'name email verified',
          },
        },
        { path: 'matchedDonorId', select: 'name email' },
      ],
    })
    .sort({ updatedAt: -1 })
    .limit(20);

  const notifications = await Notification.find({ user: donor._id }).sort({ createdAt: -1 }).limit(20);

  res.json({
    success: true,
    profile: buildDonorPayload(donor),
    incomingMatches: incomingMatches.filter((match) => match.request?.status === 'pending'),
    history,
    notifications,
  });
}

export async function updateProfile(req, res) {
  const bloodGroup = req.body.bloodGroup;
  const organPreferences = Array.isArray(req.body.organPreferences) ? req.body.organPreferences : [];
  const availabilityStatus = req.body.availabilityStatus || req.user.availabilityStatus || 'available';
  const locationCoordinates = req.body.locationCoordinates || req.body.location;

  if (!bloodGroup || !BLOOD_GROUPS.includes(bloodGroup)) {
    throw createHttpError(400, 'A valid blood group is required.');
  }

  if (!AVAILABILITY_STATUS.includes(availabilityStatus)) {
    throw createHttpError(400, 'Invalid availability status.');
  }

  const saved = await saveDonorProfile(req.user._id, {
    bloodGroup,
    organPreferences,
    availabilityStatus,
    address: req.body.address || '',
    phone: req.body.phone || '',
    locationCoordinates,
  });

  if (!saved) {
    throw createHttpError(404, 'Donor account not found.');
  }

  await detectDuplicateAccountRisk({
    userId: req.user._id,
    phone: req.body.phone || '',
    req,
  });

  await detectLocationMismatch({
    userId: req.user._id,
    expectedPoint: normalizePoint(locationCoordinates),
    referencePoint: saved.user.locationCoordinates,
    context: 'donor_profile_update',
    req,
  });

  await logAuditEvent({
    userId: req.user._id,
    action: 'DONOR_PROFILE_UPDATED',
    resource: 'User',
    resourceId: req.user._id,
    details: {
      bloodGroup,
      organPreferencesCount: organPreferences.length,
      availabilityStatus,
    },
    req,
  });

  if (saved.user.availabilityStatus === 'available') {
    await refreshPendingRequestsForDonor(saved.user);
  }

  res.json({
    success: true,
    profile: buildDonorPayload(saved.user),
  });
}

export async function updateAvailability(req, res) {
  const { availabilityStatus } = req.body;
  if (!AVAILABILITY_STATUS.includes(availabilityStatus)) {
    throw createHttpError(400, 'Invalid availability status.');
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { availabilityStatus } },
    { new: true }
  );

  await DonorProfile.findOneAndUpdate(
    { user: req.user._id },
    { $set: { availability: availabilityStatus === 'available' ? 'AVAILABLE' : 'BUSY' } },
    { new: true }
  );

  if (availabilityStatus === 'available') {
    await refreshPendingRequestsForDonor(user);
  }

  res.json({
    success: true,
    availabilityStatus: user.availabilityStatus,
  });
}

export async function respondToMatch(req, res) {
  const result = await handleDonorResponse({
    donorId: req.user._id,
    matchId: req.params.matchId,
    action: req.body.action,
    req,
  });

  res.json({
    success: true,
    message: req.body.action === 'accept' ? 'Request accepted.' : 'Request declined.',
    result,
  });
}

export async function markNotificationRead(req, res) {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: { read: true, readAt: new Date() } }
  );

  res.json({ success: true });
}
