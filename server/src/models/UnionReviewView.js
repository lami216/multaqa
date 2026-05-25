import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'UnionReview', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });

schema.index({ eventId: 1, userId: 1 }, { unique: true });

export default mongoose.model('UnionReviewView', schema);
