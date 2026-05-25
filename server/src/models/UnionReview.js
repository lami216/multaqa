import mongoose from 'mongoose';

const unionReviewSchema = new mongoose.Schema({
  organizer: { type: String, enum: ['UNEM', 'UGEM'], required: true },
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true },
  majorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Major', required: true },
  level: { type: String, enum: ['L1', 'L2', 'L3', 'M1', 'M2'], required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  subjectCode: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true, maxlength: 220 },
  startsAt: { type: Date, required: true },
  status: { type: String, enum: ['published', 'expired', 'cancelled'], default: 'published' },
  viewsCount: { type: Number, default: 0 },
  goingCount: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

unionReviewSchema.index({ status: 1, startsAt: 1 });
unionReviewSchema.index({ facultyId: 1, majorId: 1, level: 1 });
unionReviewSchema.index({ subjectCode: 1 });

export default mongoose.model('UnionReview', unionReviewSchema);
