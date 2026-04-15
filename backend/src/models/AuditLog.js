import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, required: true },
    resource: { type: String, required: true },
    resourceId: { type: mongoose.Schema.Types.Mixed, default: null },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info',
    },
  },
  { timestamps: true }
);

auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, createdAt: -1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
