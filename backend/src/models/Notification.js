import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    emailSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1 });
notificationSchema.index({ createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
