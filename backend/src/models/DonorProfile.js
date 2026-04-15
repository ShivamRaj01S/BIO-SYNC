import mongoose from 'mongoose';
import { normalizePoint } from '../utils/geo.js';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const geoPointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (v) =>
          Array.isArray(v) &&
          v.length === 2 &&
          v[0] >= -180 &&
          v[0] <= 180 &&
          v[1] >= -90 &&
          v[1] <= 90,
        message: 'Invalid coordinates [lng, lat]',
      },
    },
  },
  { _id: false }
);

const donorProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    bloodGroup: {
      type: String,
      required: true,
      enum: BLOOD_GROUPS,
    },
    organConsent: { type: Boolean, default: false },
    location: {
      type: geoPointSchema,
      default: undefined,
    },
    address: { type: String, trim: true },
    availability: {
      type: String,
      enum: ['AVAILABLE', 'BUSY'],
      default: 'AVAILABLE',
    },
    reliabilityScore: { type: Number, default: 100, min: 0, max: 100 },
    noShowCount: { type: Number, default: 0 },
    completedDonations: { type: Number, default: 0 },
    lastDonationDate: { type: Date, default: null },
    waitingPeriodDays: { type: Number, default: 56 },
  },
  { timestamps: true }
);

donorProfileSchema.pre('validate', function sanitizeLocation(next) {
  this.location = normalizePoint(this.location) || undefined;
  next();
});

donorProfileSchema.index({ 'location': '2dsphere' });
donorProfileSchema.index({ availability: 1, bloodGroup: 1 });

export { BLOOD_GROUPS };
export default mongoose.model('DonorProfile', donorProfileSchema);
