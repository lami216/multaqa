import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  banned: {
    type: Boolean,
    default: false
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  refreshToken: String
}, {
  timestamps: true
});

userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

const User = mongoose.model('User', userSchema);

export default User;
