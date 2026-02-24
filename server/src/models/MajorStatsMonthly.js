import mongoose from 'mongoose';

const majorStatsMonthlySchema = new mongoose.Schema({
  majorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Major',
    required: true,
    index: true
  },
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    required: true,
    index: true
  },
  monthKey: {
    type: String,
    required: true,
    index: true
  },
  postsCount: { type: Number, default: 0 },
  matchesCount: { type: Number, default: 0 },
  newUsersCount: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: false, updatedAt: false }
});

majorStatsMonthlySchema.index({ monthKey: 1, score: -1 });
majorStatsMonthlySchema.index({ majorId: 1, monthKey: 1 }, { unique: true });
majorStatsMonthlySchema.index({ facultyId: 1, monthKey: 1 });

const MajorStatsMonthly = mongoose.model('MajorStatsMonthly', majorStatsMonthlySchema);

export default MajorStatsMonthly;
