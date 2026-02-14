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
    maxlength: 2000
  },
  category: {
    type: String,
    required: true,
    enum: ['study_partner', 'project_team', 'tutor_offer']
  },
  availabilityDate: {
    type: Date
  },
  tags: [{
    type: String,
    trim: true
  }],
  subjectCodes: [{
    type: String,
    trim: true
  }],
  postRole: {
    type: String,
    enum: ['need_help', 'can_help', 'td', 'archive']
  },
  teamRoles: [{
    type: String,
    enum: ['general_review', 'td', 'archive']
  }],
  // Legacy field kept for backward compatibility with old records.
  studentRole: {
    type: String,
    enum: ['helper', 'partner', 'learner'],
    select: false
  },
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
  expiresAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'matched', 'expired', 'closed'],
    default: 'active'
  },
  closedAt: {
    type: Date,
    default: null
  },
  closeReason: {
    type: String,
    maxlength: 500
  },
  acceptedUserIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  participantTargetCount: {
    type: Number,
    min: 3
  }
}, {
  timestamps: true
});

postSchema.index({ title: 'text', description: 'text', tags: 'text' });
postSchema.index({ authorId: 1 });
postSchema.index({ category: 1 });
postSchema.index({ faculty: 1 });
postSchema.index({ level: 1 });
postSchema.index({ postRole: 1 });
postSchema.index({ teamRoles: 1 });
postSchema.index({ subjectCodes: 1 });
postSchema.index({ tags: 1 });
postSchema.index({ status: 1 });
postSchema.index({ expiresAt: 1 });
postSchema.index({ availabilityDate: 1 });
postSchema.index({ createdAt: -1 });

const Post = mongoose.model('Post', postSchema);

export default Post;
