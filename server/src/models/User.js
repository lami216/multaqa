import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: function () { return Boolean(this.passwordHash); },
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: function () { return !this.googleSub && !this.telegramSub; }
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
  verificationToken: { type: String, select: false },
  emailVerifiedAt: Date,
  verificationHash: { type: String, select: false },
  verificationEmail: { type: String, select: false },
  verificationExpires: { type: Date, select: false },
  verificationSentAt: { type: Date, select: false },
  googleSub: String,
  telegramSub: String,
  telegramUserId: String,
  telegramOwnerId: String,
  telegramConsentEventDate: Number,
  telegramConsentEventId: Number,
  telegramNotificationsEnabled: { type: Boolean, default: false },
  telegramNotificationsDisabledAt: Date,
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpires: Date,
  refreshToken: String,
  previousRefreshTokenHash: String,
  previousRefreshExpires: Date,
  tokenVersion: { type: Number, default: 0 },
  telegramChatId: String,
  telegramLinked: {
    type: Boolean,
    default: false
  },
  remainingSubjects: [{
    type: String,
    trim: true
  }],
  remainingSubjectsConfirmed: {
    type: Boolean,
    default: false
  },
  averageRating: {
    type: Number,
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  sessionsCount: {
    type: Number,
    default: 0
  }

}, {
  timestamps: true
});

userSchema.index({ email: 1 }, { name: 'email_unique_present', unique: true, partialFilterExpression: { email: { $type: 'string' } } });
for (const field of ['googleSub', 'telegramSub', 'telegramUserId', 'telegramOwnerId']) {
  userSchema.index({ [field]: 1 }, { unique: true, partialFilterExpression: { [field]: { $type: 'string' } } });
}

userSchema.index(
  { telegramChatId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      telegramLinked: true,
      telegramChatId: { $exists: true, $type: 'string' }
    }
  }
);

const User = mongoose.model('User', userSchema);

export default User;
