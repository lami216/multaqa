import mongoose from 'mongoose';

const postSnapshotSchema = new mongoose.Schema({
  title: { type: String, trim: true, default: '' },
  subjectCodes: [{ type: String, trim: true }],
  subjectNames: [{ type: String, trim: true }],
  role: { type: String, trim: true, default: '' }
}, { _id: false });

const sessionSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  postSnapshot: { type: postSnapshotSchema, required: true },
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
  status: {
    type: String,
    enum: ['in_progress', 'pending_confirmation', 'completed'],
    default: 'in_progress'
  },
  startedAt: { type: Date, required: true },
  endedAt: { type: Date, default: null },
  endingRequestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  endingRequestedAt: { type: Date, default: null },
  autoCloseAt: { type: Date, default: null },
  completionDeadlineAt: { type: Date, default: null },
  confirmedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  completedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  rating: {
    type: Map,
    of: new mongoose.Schema({
      score: { type: Number, min: 1, max: 5, required: true },
      review: { type: String, trim: true, default: '' },
      createdAt: { type: Date, default: Date.now }
    }, { _id: false }),
    default: {}
  }
}, { timestamps: true });

sessionSchema.index({ conversationId: 1 }, { unique: true });
sessionSchema.index({ participants: 1, status: 1 });
sessionSchema.index({ autoCloseAt: 1, status: 1 });

const Session = mongoose.model('Session', sessionSchema);

export default Session;
