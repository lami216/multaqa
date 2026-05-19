import mongoose from 'mongoose';

const weeklyDigestLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  weekKey: {
    type: String,
    required: true
  },
  sentAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

weeklyDigestLogSchema.index({ userId: 1, weekKey: 1 }, { unique: true });

const WeeklyDigestLog = mongoose.model('WeeklyDigestLog', weeklyDigestLogSchema);

export default WeeklyDigestLog;
