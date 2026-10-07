import crypto from 'node:crypto';
import User from '../models/User.js';
import Profile from '../models/Profile.js';
import { issueVerification } from './emailVerificationService.js';

export function normalizeClaims(provider, claims) {
  if (
    !claims ||
    typeof claims.sub !== 'string' ||
    !claims.sub ||
    claims.sub.length > 255
  )
    throw new Error('Invalid identity');
  if (provider === 'telegram') {
    if (!Number.isSafeInteger(claims.id) || claims.id <= 0)
      throw new Error('Invalid Telegram identity');
    return {
      provider,
      subject: claims.sub,
      telegramUserId: String(claims.id),
      emailVerified: false
    };
  }
  if (provider !== 'google') throw new Error('Invalid provider');
  const email =
    typeof claims.email === 'string'
      ? claims.email.trim().toLowerCase()
      : undefined;
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error('Invalid Google email');
  const emailVerified =
    claims.email_verified === true &&
    (email.endsWith('@gmail.com') ||
      (typeof claims.hd === 'string' && claims.hd.length > 0));
  return { provider, subject: claims.sub, email, emailVerified };
}

export const versionMatch = (version) =>
  version === 0 ? { $in: [0, null] } : version;
export async function resolveIdentity(identity, flow, currentAuth) {
  const field = identity.provider === 'google' ? 'googleSub' : 'telegramSub';
  if (flow.intent === 'link') {
    if (
      !currentAuth ||
      currentAuth.userId !== String(flow.userId) ||
      currentAuth.tokenVersion !== flow.tokenVersion ||
      !Number.isInteger(currentAuth.authTime) ||
      Date.now() / 1000 - currentAuth.authTime > 600
    )
      throw new Error('Reauthentication required');
    const set = { [field]: identity.subject };
    if (identity.provider === 'telegram') {
      set.telegramUserId = identity.telegramUserId;
      set.telegramOwnerId = identity.telegramUserId;
    }
    // Legacy notification ownership is not automatically converted into login.
    if (identity.provider === 'telegram') {
      const collision = await User.exists({
        _id: { $ne: flow.userId },
        telegramChatId: identity.telegramUserId,
        telegramLinked: true
      });
      if (collision) throw new Error('Identity already associated');
    }
    const user = await User.findOneAndUpdate(
      {
        _id: flow.userId,
        banned: { $ne: true },
        tokenVersion: versionMatch(flow.tokenVersion),
        ...(identity.provider === 'telegram'
          ? { telegramOwnerId: { $in: [null, identity.telegramUserId] } }
          : {}),
        $or: [{ [field]: null }, { [field]: identity.subject }]
      },
      { $set: set },
      { new: true }
    );
    if (!user) throw new Error('Identity cannot be linked');
    return user;
  }
  let user = await User.findOne({ [field]: identity.subject });
  if (user) {
    if (
      user.banned ||
      (identity.provider === 'telegram' &&
        user.telegramUserId !== identity.telegramUserId)
    )
      throw new Error('Identity unavailable');
    return user;
  }
  if (identity.email && (await User.exists({ email: identity.email })))
    throw new Error('Sign in to your existing account to link this provider');
  if (
    identity.provider === 'telegram' &&
    (await User.exists({
      telegramChatId: identity.telegramUserId,
      telegramLinked: true
    }))
  )
    throw new Error('Sign in to link your existing account');
  const data = {
    username: `student_${crypto.randomBytes(8).toString('hex')}`,
    [field]: identity.subject,
    emailVerified: identity.emailVerified,
    ...(identity.email ? { email: identity.email } : {}),
    ...(identity.emailVerified ? { emailVerifiedAt: new Date() } : {}),
    ...(identity.telegramUserId
      ? {
          telegramUserId: identity.telegramUserId,
          telegramOwnerId: identity.telegramUserId
        }
      : {})
  };
  try {
    user = await User.create(data);
  } catch (error) {
    if (error.code !== 11000) throw error;
    user = await User.findOne({ [field]: identity.subject });
    if (!user || user.banned) throw new Error('Identity already associated');
  }
  await Profile.findOneAndUpdate(
    { userId: user._id },
    { $setOnInsert: { userId: user._id } },
    { upsert: true }
  );
  if (identity.email && !identity.emailVerified) await issueVerification(user);
  return user;
}
