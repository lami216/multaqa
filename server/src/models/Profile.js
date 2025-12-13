import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  displayName: {
    type: String,
    trim: true
  },
  faculty: {
    type: String,
    trim: true
  },
  major: {
    type: String,
    trim: true
  },
  level: {
    type: String,
    enum: ['L1', 'L2', 'L3', 'M1', 'M2'],
    trim: true
  },
  skills: [{
    type: String,
    trim: true
  }],
  courses: [{
    type: String,
    trim: true
  }],
  availability: {
    type: String,
    trim: true
  },
  languages: [{
    type: String,
    enum: ['Arabic', 'French']
  }],
  bio: {
    type: String,
    maxlength: 500
  },
  avatarUrl: String,
  avatarFileId: String
}, {
  timestamps: true
});

profileSchema.index({ userId: 1 });

const Profile = mongoose.model('Profile', profileSchema);

export default Profile;
