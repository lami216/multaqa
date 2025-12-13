import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  relatedPostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }
}, {
  timestamps: true
});

chatSchema.index({ participants: 1 });
chatSchema.index({ lastMessageAt: -1 });

const Chat = mongoose.model('Chat', chatSchema);

export default Chat;
