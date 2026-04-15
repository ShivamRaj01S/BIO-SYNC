import { verifyGoogleToken } from '../config/googleAuth.js';
import User from '../models/User.js';
import { createHttpError } from '../utils/errors.js';
import { signToken } from '../utils/jwt.js';
import { logAuditEvent } from '../services/auditService.js';
import { detectDuplicateAccountRisk } from '../services/fraudService.js';
import { hydrateUserWithLegacyProfile } from '../services/profileService.js';
import { sendRegistrationEmail } from '../services/emailService.js';
import { SELF_REGISTER_ROLES } from '../utils/constants.js';

function buildUserPayload(user) {
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    role: user.role,
    verified: Boolean(user.verified),
    status: user.status,
    bloodGroup: user.bloodGroup || null,
    organPreferences: user.organPreferences || [],
    availabilityStatus: user.availabilityStatus,
    reliabilityScore: user.reliabilityScore,
    locationCoordinates: user.locationCoordinates || null,
    address: user.address || '',
    phone: user.phone || '',
  };
}

export async function googleLogin(req, res) {
  const { idToken, role } = req.body;
  if (!idToken) {
    throw createHttpError(400, 'Google ID token is required.');
  }

  const payload = await verifyGoogleToken(idToken);
  const { email, name, picture, sub: googleId } = payload;

  let user = await User.findOne({ $or: [{ email }, { googleId }] });

  if (user) {
    if (user.status !== 'active') {
      throw createHttpError(403, 'This account is suspended or blocked.');
    }

    if (!user.googleId || user.googleId !== googleId || user.name !== name || user.picture !== picture) {
      user.googleId = googleId;
      user.name = name || user.name;
      user.picture = picture || user.picture;
      await user.save();
    }
  } else {
    if (!role || !SELF_REGISTER_ROLES.includes(role)) {
      throw createHttpError(
        400,
        `New users must choose ${SELF_REGISTER_ROLES.join(', ').replace(', hospital', ', or hospital')} as their role.`
      );
    }

    user = await User.create({
      email,
      name,
      picture,
      googleId,
      role,
      availabilityStatus: role === 'donor' ? 'available' : 'inactive',
      verified: false,
    });

    await detectDuplicateAccountRisk({
      userId: user._id,
      email,
      googleId,
      req,
    });

    await logAuditEvent({
      userId: user._id,
      action: 'REGISTER',
      resource: 'User',
      resourceId: user._id,
      details: { role: user.role },
      req,
    });

    if (process.env.EMAIL_USER) {
      await sendRegistrationEmail(user.email, user.name, user.role);
    }
  }

  const token = signToken({ id: user._id, role: user.role });

  res.json({
    success: true,
    token,
    user: buildUserPayload(user),
  });
}

export async function getCurrentUser(req, res) {
  const hydrated = await hydrateUserWithLegacyProfile(req.user._id);
  const user = hydrated.user || req.user;

  res.json({
    success: true,
    user: buildUserPayload(user),
    profile: hydrated.profile || null,
  });
}
