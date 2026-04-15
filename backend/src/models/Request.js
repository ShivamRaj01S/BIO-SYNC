import mongoose from 'mongoose';

import { BLOOD_GROUPS, REQUEST_STATUS, REQUEST_TYPES, URGENCY_LEVELS } from '../utils/constants.js';

const requestSchema = new mongoose.Schema(
  {
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requesterRole: {
      type: String,
      enum: ['patient', 'hospital'],
      required: true,
    },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'HospitalProfile', required: true },
    requiredType: { type: String, enum: REQUEST_TYPES, required: true },
    bloodGroup: { type: String, enum: BLOOD_GROUPS, required: true },
    organType: { type: String, trim: true, default: '' },
    urgencyLevel: { type: String, enum: URGENCY_LEVELS, required: true, default: 'medium' },
    locationCoordinates: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    address: { type: String, trim: true },
    status: { type: String, enum: REQUEST_STATUS, default: 'pending' },
    matchedDonorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    matchedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, trim: true, default: '' },
    searchRadiusKm: { type: Number, default: null },
    escalationLevel: { type: Number, default: 0 },
    nextEscalationAt: { type: Date, default: null },
    lastNotifiedAt: { type: Date, default: null },
    requiredUnits: { type: Number, default: 1, min: 1, max: 10 },
    notes: { type: String, trim: true },
    fraudReviewRequired: { type: Boolean, default: false },
  },
  { timestamps: true }
);

requestSchema.index({ requesterId: 1, status: 1 });
requestSchema.index({ patientId: 1, status: 1 });
requestSchema.index({ hospitalId: 1, status: 1 });
requestSchema.index({ status: 1, requiredType: 1, urgencyLevel: 1 });
requestSchema.index({ locationCoordinates: '2dsphere' });
requestSchema.index({ createdAt: -1 });

export { REQUEST_TYPES, URGENCY_LEVELS, REQUEST_STATUS };
export default mongoose.model('Request', requestSchema);
