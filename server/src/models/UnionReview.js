import mongoose from 'mongoose';

const unionReviewSchema = new mongoose.Schema({
  organizer: { type: String, enum: ['UNEM', 'UGEM'], required: true },
  facultyId: { type: String, required: true, trim: true },
  majorId: { type: String, required: true, trim: true },
  level: { type: String, enum: ['L1', 'L2', 'L3', 'M1', 'M2'], required: true },
  subjectCode: { type: String, required: true, trim: true },
  subjectNameAr: { type: String, trim: true },
  subjectNameFr: { type: String, trim: true },
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
