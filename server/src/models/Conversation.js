import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['post', 'direct'],
    required: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  participantsKey: {
    type: String,
    required: true
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  lastMessageAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });
conversationSchema.index(
  { type: 1, postId: 1, participantsKey: 1 },
  { unique: true, partialFilterExpression: { type: 'post' } }
);
conversationSchema.index(
  { type: 1, participantsKey: 1 },
  { unique: true, partialFilterExpression: { type: 'direct' } }
);

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
