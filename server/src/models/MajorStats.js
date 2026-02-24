import mongoose from 'mongoose';

const majorStatsSchema = new mongoose.Schema({
  majorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Major',
    required: true,
    unique: true,
    index: true
  },
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    required: true,
    index: true
  },
  allTimePosts: { type: Number, default: 0 },
  allTimeMatches: { type: Number, default: 0 },
  allTimeUsers: { type: Number, default: 0 },
  allTimeScore: { type: Number, default: 0 },
  monthlyPosts: { type: Number, default: 0 },
  monthlyMatches: { type: Number, default: 0 },
  monthlyUsers: { type: Number, default: 0 },
  monthlyScore: { type: Number, default: 0 },
  currentMonth: {
    type: String,
    default: () => new Date().toISOString().slice(0, 7)
  }
}, {
  timestamps: { createdAt: false, updatedAt: true }
});

majorStatsSchema.index({ majorId: 1 });
majorStatsSchema.index({ facultyId: 1 });
majorStatsSchema.index({ monthlyScore: -1 });
majorStatsSchema.index({ allTimeScore: -1 });

const MajorStats = mongoose.model('MajorStats', majorStatsSchema);

export default MajorStats;
