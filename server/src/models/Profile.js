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
  facultyId: {
    type: String,
    trim: true
  },
  major: {
    type: String,
    trim: true
  },
  majorId: {
    type: String,
    trim: true
  },
  level: {
    type: String,
    enum: ['L1', 'L2', 'L3', 'M1', 'M2'],
    trim: true
  },
  semesterId: {
    type: String,
    trim: true
  },
  semester: {
    type: String,
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
  subjects: [{
    type: String,
    trim: true
  }],
  subjectCodes: [{
    type: String,
    trim: true
  }],
  subjectsSettings: [{
    subjectCode: {
      type: String,
      trim: true,
      required: true
    },
    isPriority: {
      type: Boolean,
      default: false
    }
  }],
  remainingSubjects: [{
    subjectCode: {
      type: String,
      trim: true,
      required: true
    },
    level: {
      type: String,
      enum: ['L1', 'L2', 'L3', 'M1', 'M2'],
      trim: true,
      required: true
    },
    majorId: {
      type: String,
      trim: true,
      required: true
    }
  }],
  prioritiesOrder: {
    type: [{
      type: String,
      enum: ['need_help', 'can_help', 'td', 'archive']
    }],
    default: ['need_help', 'can_help', 'td', 'archive']
  },
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
  avatarFileId: String,
  profileLocked: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});


const Profile = mongoose.model('Profile', profileSchema);

export default Profile;
