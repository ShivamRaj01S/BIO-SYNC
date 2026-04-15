import HospitalProfile from '../models/HospitalProfile.js';
import Request from '../models/Request.js';
import { createHttpError } from '../utils/errors.js';
import { createPatientBloodRequest } from '../services/requestService.js';

function normalizeRequestPayload(body) {
  return {
    hospitalId: body.hospitalId,
    bloodGroup: body.bloodGroup,
    urgencyLevel: body.urgencyLevel || body.urgency || 'medium',
    locationCoordinates: body.locationCoordinates || body.location,
    address: body.address || '',
    notes: body.notes || '',
    requiredUnits: body.requiredUnits || 1,
  };
}

export async function getDashboard(req, res) {
  const hospitals = await HospitalProfile.find({ verificationStatus: 'verified' })
    .populate('user', 'name email verified')
    .sort({ hospitalName: 1 });

  const requests = await Request.find({
    requesterId: req.user._id,
    requesterRole: 'patient',
  })
    .populate('requesterId', 'name email role')
    .populate('patientId', 'name email role')
    .populate({
      path: 'hospitalId',
      populate: {
        path: 'user',
        select: 'name email verified',
      },
    })
    .populate('matchedDonorId', 'name email reliabilityScore')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    hospitals,
    requests,
  });
}

export async function createBloodRequest(req, res) {
  const requestedType = req.body.requiredType || req.body.type || 'blood';
  if (requestedType !== 'blood') {
    throw createHttpError(403, 'Patients can only create blood donation requests.');
  }

  const request = await createPatientBloodRequest({
    user: req.user,
    payload: normalizeRequestPayload(req.body),
    req,
  });

  res.status(201).json({
    success: true,
    request,
  });
}

export async function getRequestById(req, res) {
  const request = await Request.findOne({
    _id: req.params.id,
    requesterId: req.user._id,
    requesterRole: 'patient',
  })
    .populate({
      path: 'hospitalId',
      populate: {
        path: 'user',
        select: 'name email verified',
      },
    })
    .populate('matchedDonorId', 'name email reliabilityScore');

  if (!request) {
    throw createHttpError(404, 'Request not found.');
  }

  res.json({
    success: true,
    request,
  });
}
