import HospitalProfile from '../models/HospitalProfile.js';
import AuditLog from '../models/AuditLog.js';
import Request from '../models/Request.js';
import User from '../models/User.js';
import { createHttpError } from '../utils/errors.js';
import { logAuditEvent } from '../services/auditService.js';
import { sendHospitalVerifiedEmail } from '../services/emailService.js';

async function getAnalytics() {
  const [
    totalUsers,
    totalDonors,
    totalPatients,
    totalHospitals,
    verifiedHospitals,
    activeRequests,
    matchedRequests,
    completedRequests,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'donor' }),
    User.countDocuments({ role: 'patient' }),
    User.countDocuments({ role: 'hospital' }),
    User.countDocuments({ role: 'hospital', verified: true }),
    Request.countDocuments({ status: 'pending' }),
    Request.countDocuments({ status: 'matched' }),
    Request.countDocuments({ status: 'completed' }),
  ]);

  return {
    totalUsers,
    totalDonors,
    totalPatients,
    totalHospitals,
    verifiedHospitals,
    activeRequests,
    matchedRequests,
    completedRequests,
  };
}

export async function getDashboard(req, res) {
  const [pendingHospitals, users, analytics, securityOverview] = await Promise.all([
    HospitalProfile.find({ verificationStatus: 'pending' })
      .populate('user', 'name email verified status')
      .sort({ createdAt: -1 }),
    User.find().select('name email role status verified flags createdAt').sort({ createdAt: -1 }).limit(100),
    getAnalytics(),
    getSecurityOverviewData(),
  ]);

  res.json({
    success: true,
    pendingHospitals,
    users,
    analytics,
    securityOverview,
  });
}

export async function verifyHospital(req, res) {
  const { approved } = req.body;
  const profile = await HospitalProfile.findById(req.params.id).populate('user');
  if (!profile) {
    throw createHttpError(404, 'Hospital profile not found.');
  }

  profile.verificationStatus = approved ? 'verified' : 'rejected';
  profile.verifiedBy = req.user._id;
  profile.verifiedAt = new Date();
  await profile.save();

  if (profile.user) {
    profile.user.verified = Boolean(approved);
    await profile.user.save();
  }

  if (profile.user?.email && process.env.EMAIL_USER) {
    await sendHospitalVerifiedEmail(profile.user.email, profile.hospitalName, Boolean(approved));
  }

  await logAuditEvent({
    userId: req.user._id,
    action: 'HOSPITAL_VERIFIED',
    resource: 'HospitalProfile',
    resourceId: profile._id,
    details: {
      approved: Boolean(approved),
      hospitalUserId: profile.user?._id || null,
    },
    req,
  });

  res.json({
    success: true,
    profile,
  });
}

export async function getUsers(req, res) {
  const filter = {};
  if (req.query.role) {
    filter.role = req.query.role;
  }
  if (req.query.status) {
    filter.status = req.query.status;
  }

  const users = await User.find(filter)
    .select('name email role status verified flags createdAt')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    users,
  });
}

export async function updateUserStatus(req, res) {
  const { status } = req.body;
  if (!['active', 'suspended', 'blocked'].includes(status)) {
    throw createHttpError(400, 'Invalid user status.');
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    throw createHttpError(404, 'User not found.');
  }

  if (user.role === 'admin') {
    throw createHttpError(403, 'Admin accounts cannot be blocked.');
  }

  user.status = status;
  await user.save();

  await logAuditEvent({
    userId: req.user._id,
    action: 'USER_STATUS_CHANGED',
    resource: 'User',
    resourceId: user._id,
    details: { status },
    req,
  });

  res.json({
    success: true,
    user,
  });
}

export async function getAuditLogs(req, res) {
  const filter = {};
  if (req.query.action) {
    filter.action = req.query.action;
  }
  if (req.query.resource) {
    filter.resource = req.query.resource;
  }

  const logs = await AuditLog.find(filter)
    .populate('user', 'name email role')
    .sort({ createdAt: -1 })
    .limit(Number(req.query.limit) || 100);

  res.json({
    success: true,
    logs,
  });
}

async function getSecurityOverviewData() {
  const [verificationLogs, blockedUsers, flaggedUsers] = await Promise.all([
    AuditLog.find({ action: 'HOSPITAL_VERIFIED' })
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(50),
    User.find({ status: 'blocked' })
      .select('name email role status flags createdAt')
      .sort({ updatedAt: -1 }),
    User.find({ 'flags.status': 'open' })
      .select('name email role status flags createdAt')
      .sort({ updatedAt: -1 }),
  ]);

  return {
    verificationLogs,
    blockedUsers,
    flaggedUsers,
  };
}

export async function getSecurityOverview(req, res) {
  res.json({
    success: true,
    ...(await getSecurityOverviewData()),
  });
}

export async function getHospitalById(req, res) {
  const profile = await HospitalProfile.findById(req.params.id).populate(
    'user',
    'name email verified status'
  );

  if (!profile) {
    throw createHttpError(404, 'Hospital profile not found.');
  }

  res.json({
    success: true,
    profile,
  });
}
