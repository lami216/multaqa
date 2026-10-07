import express from 'express';
import { z } from 'zod';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import rateLimit from '../middleware/rateLimit.js';
import { validate } from '../middleware/validation.js';
import {
  isEmailVerified,
  hasVerifiedIdentity,
  issueVerification,
  consumeVerification
} from '../services/emailVerificationService.js';
import {
  beginFlow,
  takeFlow,
  providerConfig,
  providerEnabled,
  callbackUri,
  exchangeCode
} from '../services/oidcService.js';
import {
  normalizeClaims,
  resolveIdentity,
  versionMatch
} from '../services/federatedIdentityService.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken
} from '../utils/jwt.js';
import { setAuthCookies } from '../controllers/authController.js';
const router = express.Router();
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
const limit = (name, max) =>
  rateLimit({
    windowMs: 3600000,
    max,
    keyGenerator: (req) => `ratelimit:${name}:${req.user?._id || req.ip}`
  });
const recent = (req, res, next) => {
  if (
    !Number.isInteger(req.auth?.authTime) ||
    Date.now() / 1000 - req.auth.authTime > 600
  )
    return res
      .status(403)
      .json({ error: 'Sign in again before changing login methods' });
  next();
};
router.use((req, res, next) => {
  if (
    req.method !== 'GET' &&
    req.headers.origin &&
    req.headers.origin !== process.env.CORS_ORIGIN
  )
    return res.status(403).json({ error: 'Invalid request origin' });
  next();
});
router.get('/providers', (req, res) =>
  res.json({
    google: providerEnabled('google'),
    telegram: providerEnabled('telegram')
  })
);
router.post(
  '/verification/resend',
  authenticate,
  limit('email-resend', 3),
  wrap(async (req, res) => {
    await issueVerification(req.user);
    res.json({
      message:
        'If verification is needed, an email will be sent. Please wait before requesting again.'
    });
  })
);
router.post(
  '/verification/confirm',
  limit('email-confirm', 20),
  validate(z.object({ token: z.string().regex(/^[a-f0-9]{64}$/i) }).strict()),
  wrap(async (req, res) => {
    const user = await consumeVerification(req.body.token);
    if (!user)
      return res
        .status(400)
        .json({ error: 'Invalid or expired verification link' });
    res.json({ message: 'Email verified' });
  })
);
router.post(
  '/email',
  authenticate,
  recent,
  limit('email-add', 3),
  validate(
    z
      .object({ email: z.string().email().max(254).trim().toLowerCase() })
      .strict()
  ),
  wrap(async (req, res) => {
    try {
      const user = await User.findOneAndUpdate(
        {
          _id: req.user._id,
          email: null,
          tokenVersion: versionMatch(req.user.tokenVersion ?? 0),
          banned: { $ne: true }
        },
        {
          $set: { email: req.body.email, emailVerified: false },
          $unset: { emailVerifiedAt: '' }
        },
        { new: true }
      );
      if (!user)
        return res.status(409).json({ error: 'An email is already attached' });
      await issueVerification(user);
      res.json({ message: 'Verify your email before using it for recovery' });
    } catch (error) {
      if (error.code === 11000)
        return res.status(409).json({ error: 'Email cannot be attached' });
      throw error;
    }
  })
);
router.post(
  '/:provider/start',
  limit('oidc-start', 20),
  wrap(async (req, res) => {
    const { provider } = req.params;
    if (!providerEnabled(provider))
      return res
        .status(503)
        .json({ error: 'Login provider is not configured' });
    const { state, binding, url } = await beginFlow(provider, 'login');
    res.cookie(`oidc_${state}`, binding, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 300000
    });
    res.json({ url });
  })
);
router.post(
  '/:provider/link',
  authenticate,
  recent,
  limit('oidc-link', 10),
  wrap(async (req, res) => {
    const { provider } = req.params;
    if (!providerEnabled(provider))
      return res
        .status(503)
        .json({ error: 'Login provider is not configured' });
    const { state, binding, url } = await beginFlow(provider, 'link', req.user);
    res.cookie(`oidc_${state}`, binding, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 300000
    });
    res.json({ url });
  })
);
router.get(
  '/:provider/callback',
  limit('oidc-callback', 40),
  wrap(async (req, res) => {
    const { provider } = req.params;
    const state = req.query.state;
    if (typeof state !== 'string' || !/^[a-f0-9]{64}$/.test(state))
      return res.redirect('/login?auth_error=failed');
    const cookie = `oidc_${state}`;
    try {
      const flow = await takeFlow(provider, state, req.cookies[cookie]);
      if (!flow) throw new Error('Invalid flow');
      res.clearCookie(cookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/auth'
      });
      const callback = new URL(callbackUri(provider));
      callback.search = new URLSearchParams(req.query).toString();
      const claims = await exchangeCode(
        providerConfig(provider),
        callback,
        state,
        flow
      );
      const identity = normalizeClaims(provider, claims);
      const currentAuth = verifyAccessToken(req.cookies.accessToken);
      const user = await resolveIdentity(identity, flow, currentAuth);
      const field = provider === 'google' ? 'googleSub' : 'telegramSub';
      const version = user.tokenVersion ?? 0;
      const refreshToken = generateRefreshToken(user._id, version);
      const updated = await User.findOneAndUpdate(
        {
          _id: user._id,
          [field]: identity.subject,
          tokenVersion: versionMatch(version),
          banned: { $ne: true }
        },
        {
          $set: { refreshToken, tokenVersion: version },
          $unset: { previousRefreshTokenHash: '', previousRefreshExpires: '' }
        },
        { new: true }
      );
      if (!updated) throw new Error('Account changed');
      setAuthCookies(res, generateAccessToken(user._id, version), refreshToken);
      res.redirect('/auth/complete');
    } catch {
      res.clearCookie(cookie, { path: '/api/auth' });
      res.redirect('/login?auth_error=failed');
    }
  })
);
router.delete(
  '/:provider/link',
  authenticate,
  recent,
  wrap(async (req, res) => {
    const field =
      req.params.provider === 'google'
        ? 'googleSub'
        : req.params.provider === 'telegram'
          ? 'telegramSub'
          : null;
    if (!field) return res.status(400).json({ error: 'Invalid provider' });
    const other = field === 'googleSub' ? 'telegramSub' : 'googleSub';
    const unset = {
      [field]: '',
      refreshToken: '',
      previousRefreshTokenHash: '',
      previousRefreshExpires: ''
    };
    const set = {};
    if (field === 'telegramSub') {
      unset.telegramUserId = '';
      unset.telegramChatId = '';
      unset.telegramOwnerId = '';
      set.telegramLinked = false;
      set.telegramNotificationsEnabled = false;
      set.telegramNotificationsDisabledAt = new Date();
    }
    const updated = await User.findOneAndUpdate(
      {
        _id: req.user._id,
        tokenVersion: versionMatch(req.user.tokenVersion ?? 0),
        [field]: { $type: 'string' },
        $or: [
          { [other]: { $type: 'string' } },
          {
            passwordHash: { $type: 'string' },
            emailVerifiedAt: { $type: 'date' }
          }
        ]
      },
      { $unset: unset, $set: set, $inc: { tokenVersion: 1 } },
      { new: true }
    );
    if (!updated)
      return res
        .status(409)
        .json({ error: 'Cannot remove your last usable login method' });
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
    res.json({ message: 'Login method removed. Sign in again.' });
  })
);
export { isEmailVerified, hasVerifiedIdentity };
export default router;
