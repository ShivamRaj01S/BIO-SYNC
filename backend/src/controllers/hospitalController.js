import Request from '../models/Request.js';
import { createHttpError } from '../utils/errors.js';
import { logAuditEvent } from '../services/auditService.js';
import { detectDuplicateAccountRisk, detectLocationMismatch } from '../services/fraudService.js';
import { hydrateUserWithLegacyProfile, saveHospitalProfile } from '../services/profileService.js';
import {
  completeDonation,
  createHospitalOrganRequest,
  getHospitalRequestDetails,
} from '../services/requestService.js';
import { normalizePoint } from '../utils/geo.js';

function normalizeHospitalRequestPayload(body) {
  return {
    bloodGroup: body.bloodGroup,
    organType: body.organType,
    urgencyLevel: body.urgencyLevel || body.urgency || 'critical',
    locationCoordinates: body.locationCoordinates || body.location,
    address: body.address || '',
    notes: body.notes || '',
    requiredUnits: body.requiredUnits || 1,
    patientId: body.patientId || null,
  };
}

export async function getDashboard(req, res) {
  const hydrated = await hydrateUserWithLegacyProfile(req.user._id);
  const profile = hydrated.profile || null;

  if (!profile) {
    res.json({
      success: true,
      profile: null,
      user: hydrated.user || req.user,
      requests: [],
      requiresProfileSetup: true,
    });
    return;
  }

  const requests = await getHospitalRequestDetails(req.user._id);

  res.json({
    success: true,
    profile,
    user: hydrated.user || req.user,
    requests,
    requiresProfileSetup: false,
  });
}

export async function updateProfile(req, res) {
  if (!req.body.hospitalName || !req.body.address || !req.body.city) {
    throw createHttpError(400, 'hospitalName, address, and city are required.');
  }

  const saved = await saveHospitalProfile(req.user._id, {
    hospitalName: req.body.hospitalName,
    registrationNumber: req.body.registrationNumber || '',
    address: req.body.address,
    city: req.body.city,
    state: req.body.state || '',
    pincode: req.body.pincode || '',
    contactPhone: req.body.contactPhone || '',
    documents: req.body.documents || [],
    locationCoordinates: req.body.locationCoordinates || req.body.location,
  });

  if (!saved) {
    throw createHttpError(404, 'Hospital account not found.');
  }

  await detectDuplicateAccountRisk({
    userId: req.user._id,
    phone: req.body.contactPhone || '',
    registrationNumber: req.body.registrationNumber || '',
    req,
  });

  await detectLocationMismatch({
    userId: req.user._id,
    expectedPoint: normalizePoint(req.body.locationCoordinates || req.body.location),
    referencePoint: saved.user.locationCoordinates,
    context: 'hospital_profile_update',
    req,
  });

  await logAuditEvent({
    userId: req.user._id,
    action: 'HOSPITAL_PROFILE_UPDATED',
    resource: 'HospitalProfile',
    resourceId: saved.profile._id,
    details: {
      registrationNumber: req.body.registrationNumber || '',
      documentsCount: Array.isArray(req.body.documents) ? req.body.documents.length : 0,
    },
    req,
  });

  res.json({
    success: true,
    profile: saved.profile,
    user: saved.user,
  });
}

export async function createOrganRequest(req, res) {
  const requestedType = req.body.requiredType || req.body.type || 'organ';
  if (requestedType !== 'organ') {
    throw createHttpError(403, 'Hospitals can only use this endpoint for organ requests.');
  }

  const request = await createHospitalOrganRequest({
    user: req.user,
    payload: normalizeHospitalRequestPayload(req.body),
    req,
  });

  res.status(201).json({
    success: true,
    request,
  });
}

export async function confirmDonationCompletion(req, res) {
  const request = await completeDonation({
    hospitalUser: req.user,
    requestId: req.params.id,
    payload: req.body,
    req,
  });

  res.json({
    success: true,
    request,
  });
}

export async function getRequestById(req, res) {
  const dashboardRequests = await getHospitalRequestDetails(req.user._id);
  const target = dashboardRequests.find(
    (entry) => entry.request._id.toString() === req.params.id.toString()
  );

  if (!target) {
    throw createHttpError(404, 'Request not found.');
  }

  res.json({
    success: true,
    ...target,
  });
}
