import mongoose from 'mongoose';

const joinRequestSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
});

joinRequestSchema.index({ postId: 1, requesterId: 1 }, { unique: true });
joinRequestSchema.index({ receiverId: 1, status: 1, createdAt: -1 });
joinRequestSchema.index({ status: 1, createdAt: -1 });

const JoinRequest = mongoose.model('JoinRequest', joinRequestSchema);

export default JoinRequest;
