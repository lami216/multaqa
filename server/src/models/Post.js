import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  category: {
    type: String,
    required: true,
    enum: ['study_partner', 'project_team', 'tutor_offer']
  },
  tags: [{
    type: String,
    trim: true
  }],
  faculty: {
    type: String,
    trim: true
  },
  level: {
    type: String,
    enum: ['L1', 'L2', 'L3', 'M1', 'M2']
  },
  languagePref: {
    type: String,
    enum: ['Arabic', 'French']
  },
  location: {
    type: String,
    enum: ['campus', 'online']
  },
  status: {
    type: String,
    enum: ['active', 'hidden'],
    default: 'active'
  }
}, {
  timestamps: true
});

postSchema.index({ title: 'text', description: 'text', tags: 'text' });
postSchema.index({ authorId: 1 });
postSchema.index({ category: 1 });
postSchema.index({ status: 1 });
postSchema.index({ createdAt: -1 });

const Post = mongoose.model('Post', postSchema);

export default Post;
