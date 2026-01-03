import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['post_created', 'join_requested', 'join_accepted', 'join_rejected', 'post_closed', 'post_deleted'],
    required: true
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  meta: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

eventSchema.index({ action: 1, createdAt: -1 });
eventSchema.index({ actorId: 1, createdAt: -1 });
eventSchema.index({ postId: 1, createdAt: -1 });

const Event = mongoose.model('Event', eventSchema);

export default Event;
