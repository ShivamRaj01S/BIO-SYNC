import mongoose from 'mongoose';
import validator from 'validator';

import { AVAILABILITY_STATUS, BLOOD_GROUPS, USER_ROLES, USER_STATUS } from '../utils/constants.js';
import { normalizePoint } from '../utils/geo.js';

const flagSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['duplicate_account', 'location_mismatch', 'suspicious_activity', 'manual_review'],
      required: true,
    },
    reason: { type: String, required: true, trim: true },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['open', 'reviewed', 'dismissed'],
      default: 'open',
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, _id: true }
);

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
        validator: (value) =>
          Array.isArray(value) &&
          value.length === 2 &&
          value[0] >= -180 &&
          value[0] <= 180 &&
          value[1] >= -90 &&
          value[1] <= 90,
        message: 'locationCoordinates must be [lng, lat].',
      },
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, 'Invalid email'],
    },
    name: { type: String, required: true, trim: true },
    picture: { type: String, default: null },
    googleId: { type: String, unique: true, sparse: true },
    role: {
      type: String,
      enum: USER_ROLES,
      required: true,
    },
    status: {
      type: String,
      enum: USER_STATUS,
      default: 'active',
    },
    password: { type: String, select: false },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    address: { type: String, trim: true, default: '' },
    locationCoordinates: {
      type: geoPointSchema,
      default: undefined,
    },
    bloodGroup: {
      type: String,
      enum: BLOOD_GROUPS,
      default: null,
    },
    organPreferences: {
      type: [String],
      default: [],
    },
    availabilityStatus: {
      type: String,
      enum: AVAILABILITY_STATUS,
      default: 'available',
    },
    reliabilityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
    },
    successfulDonations: {
      type: Number,
      default: 0,
    },
    noShowCount: {
      type: Number,
      default: 0,
    },
    lateCancellationCount: {
      type: Number,
      default: 0,
    },
    slowResponseCount: {
      type: Number,
      default: 0,
    },
    lastDonationDate: {
      type: Date,
      default: null,
    },
    lastDonationType: {
      type: String,
      enum: ['blood', 'organ', null],
      default: null,
    },
    availabilityResetAt: {
      type: Date,
      default: null,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    flags: {
      type: [flagSchema],
      default: [],
    },
    lastKnownIp: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

userSchema.pre('validate', function sanitizeLocationCoordinates(next) {
  this.locationCoordinates = normalizePoint(this.locationCoordinates) || undefined;
  next();
});

userSchema.index({ role: 1, status: 1 });
userSchema.index({ role: 1, availabilityStatus: 1, bloodGroup: 1 });
userSchema.index({ locationCoordinates: '2dsphere' });
userSchema.index({ verified: 1 });
userSchema.index({ 'flags.status': 1, status: 1 });

export default mongoose.model('User', userSchema);
