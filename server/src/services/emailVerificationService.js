import crypto from 'node:crypto';
import User from '../models/User.js';
import redis from '../config/redis.js';
import { sendEmailVerification } from '../utils/passwordResetEmail.js';
const digest = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');
export const isEmailVerified = (user) =>
  Boolean(user?.emailVerified && user?.emailVerifiedAt);
export const hasVerifiedIdentity = (user) =>
  Boolean(isEmailVerified(user) || user?.googleSub || user?.telegramSub);

export async function issueVerification(user) {
  if (!user.email || isEmailVerified(user)) return false;
  const count = await redis.fixedWindow(`email:verification:${user._id}`, 3600);
  if (count == null || count > 3) return false;
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const updated = await User.findOneAndUpdate(
    {
      _id: user._id,
      email: user.email,
      banned: { $ne: true },
      $nor: [{ emailVerified: true, emailVerifiedAt: { $type: 'date' } }],
      $or: [
        { verificationSentAt: { $lte: new Date(now.getTime() - 60000) } },
        { verificationSentAt: null }
      ]
    },
    {
      $set: {
        emailVerified: false,
        verificationHash: digest(token),
        verificationEmail: user.email,
        verificationExpires: new Date(now.getTime() + 1800000),
        verificationSentAt: now
      }
    },
    { new: true }
  );
  if (!updated) return false;
  try {
    await sendEmailVerification(updated.email, token);
  } catch {
    console.error('Verification email delivery unavailable');
  }
  return true;
}
export async function consumeVerification(token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) return null;
  return User.findOneAndUpdate(
    {
      verificationHash: digest(token),
      verificationExpires: { $gt: new Date() },
      banned: { $ne: true },
      $expr: { $eq: ['$email', '$verificationEmail'] }
    },
    {
      $set: { emailVerified: true, emailVerifiedAt: new Date() },
      $unset: {
        verificationHash: '',
        verificationEmail: '',
        verificationExpires: '',
        verificationToken: ''
      }
    },
    { new: true }
  );
}
