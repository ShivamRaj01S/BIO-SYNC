import mongoose from 'mongoose';
import { normalizePoint } from '../utils/geo.js';

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

const hospitalProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    hospitalName: { type: String, required: true, trim: true },
    registrationNumber: { type: String, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    documents: [
      {
        type: { type: String },
        url: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedAt: { type: Date, default: null },
    location: {
      type: geoPointSchema,
      default: undefined,
    },
  },
  { timestamps: true }
);

hospitalProfileSchema.pre('validate', function sanitizeLocation(next) {
  this.location = normalizePoint(this.location) || undefined;
  next();
});

hospitalProfileSchema.index({ verificationStatus: 1 });
hospitalProfileSchema.index({ registrationNumber: 1 }, { sparse: true });
hospitalProfileSchema.index({ location: '2dsphere' });

export default mongoose.model('HospitalProfile', hospitalProfileSchema);
