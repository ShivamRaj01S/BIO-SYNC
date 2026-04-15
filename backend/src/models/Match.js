import mongoose from 'mongoose';

import { MATCH_STATUS } from '../utils/constants.js';

const matchSchema = new mongoose.Schema(
  {
    request: { type: mongoose.Schema.Types.ObjectId, ref: 'Request', required: true },
    donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    score: { type: Number, required: true },
    scoreBreakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
    distanceKm: { type: Number, default: 0 },
    rank: { type: Number, required: true },
    status: { type: String, enum: MATCH_STATUS, default: 'notified' },
    notifiedAt: { type: Date, default: Date.now },
    responseDueAt: { type: Date, default: null },
    respondedAt: { type: Date, default: null },
    batchNumber: { type: Number, default: 1 },
  },
  { timestamps: true }
);

matchSchema.index({ request: 1, donor: 1 }, { unique: true });
matchSchema.index({ request: 1, status: 1 });
matchSchema.index({ donor: 1, status: 1 });

export { MATCH_STATUS };
export default mongoose.model('Match', matchSchema);
