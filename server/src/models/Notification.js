import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['new_message', 'chat_initiated']
  },
  payload: {
    type: mongoose.Schema.Types.Mixed
  },
  read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ read: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
