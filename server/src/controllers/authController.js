import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import redis from '../config/redis.js';
import { sendPasswordResetEmail } from '../utils/passwordResetEmail.js';
import User from '../models/User.js';
import Profile from '../models/Profile.js';
import { issueVerification, isEmailVerified, hasVerifiedIdentity } from '../services/emailVerificationService.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';

const isProduction = process.env.NODE_ENV === 'production';
const cookieSecure = process.env.COOKIE_SECURE === 'true' || isProduction;
const cookieSameSite = 'lax';
const refreshCookieOptions = {
  httpOnly: true,
  secure: cookieSecure,
  sameSite: cookieSameSite,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000
};

const accessCookieOptions = {
  httpOnly: true,
  secure: cookieSecure,
  sameSite: cookieSameSite,
  path: '/',
  maxAge: 15 * 60 * 1000
};

export const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, accessCookieOptions);
  res.cookie('refreshToken', refreshToken, refreshCookieOptions);
};

export const register = async (req, res) => {
  try {
    const { email, password, username } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Email or username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      passwordHash,
      username,
      emailVerified: false
    });

    await Profile.create({ userId: user._id });
    await issueVerification(user);

    const accessToken = generateAccessToken(user._id, user.tokenVersion ?? 0);
    const refreshToken = generateRefreshToken(user._id, user.tokenVersion ?? 0);

    user.refreshToken = refreshToken;
    user.previousRefreshTokenHash = undefined;
    user.previousRefreshExpires = undefined;
    user.tokenVersion = user.tokenVersion ?? 0;
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    res.status(201).json({
      message: 'Registration successful',
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.banned) {
      return res.status(403).json({ error: 'Account has been banned' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const observedVersion = user.tokenVersion ?? 0;
    const accessToken = generateAccessToken(user._id, observedVersion);
    const refreshToken = generateRefreshToken(user._id, observedVersion);
    const loggedInUser = await User.findOneAndUpdate({
      _id: user._id,
      passwordHash: user.passwordHash,
      tokenVersion: observedVersion === 0 ? { $in: [0, null] } : observedVersion,
      banned: { $ne: true }
    }, {
      $set: { refreshToken, tokenVersion: observedVersion },
      $unset: { previousRefreshTokenHash: '', previousRefreshExpires: '' }
    }, { new: true });
    if (!loggedInUser) {
      return res.status(401).json({ error: 'Account changed; please sign in again' });
    }

    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      message: 'Login successful',
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const now = new Date();
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const identity = {
      _id: decoded.userId,
      tokenVersion: decoded.tokenVersion === 0 ? { $in: [0, null] } : decoded.tokenVersion,
      banned: { $ne: true }
    };
    // Within this short window, both the predecessor and its successor resolve
    // to the SAME stored successor. This avoids cross-tab response-order races.
    const graceFilter = {
      ...identity,
      previousRefreshExpires: { $gt: now },
      $or: [{ refreshToken }, { previousRefreshTokenHash: tokenHash }]
    };
    let user = await User.findOne(graceFilter);
    if (!user) {
      const successor = generateRefreshToken(decoded.userId, decoded.tokenVersion, decoded.authTime ?? 0);
      user = await User.findOneAndUpdate({
        ...identity,
        refreshToken,
        $or: [{ previousRefreshExpires: { $lte: now } }, { previousRefreshExpires: null }]
      }, {
        $set: {
          refreshToken: successor,
          previousRefreshTokenHash: tokenHash,
          previousRefreshExpires: new Date(now.getTime() + 5000)
        }
      }, { new: true });
      // A simultaneous request may have already won the conditional rotation.
      if (!user) user = await User.findOne(graceFilter);
    }
    if (!user?.refreshToken) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    const newAccessToken = generateAccessToken(user._id, user.tokenVersion, decoded.authTime ?? 0);
    setAuthCookies(res, newAccessToken, user.refreshToken);
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
};

export const logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $unset: { refreshToken: '', previousRefreshTokenHash: '', previousRefreshExpires: '' },
      $inc: { tokenVersion: 1 }
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      path: '/'
    });
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      path: '/'
    });
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user || !isEmailVerified(user) || user.banned) {
      return res.json({ message: 'If the email exists, a reset code has been sent' });
    }

    const count = await redis.fixedWindow(`email:reset:${user._id}`, 3600);
    if (count == null || count > 3) return res.json({ message: 'If the email exists, a reset code has been sent' });
    const resetToken = crypto.randomBytes(32).toString('hex');
    const saved = await User.findOneAndUpdate({ _id: user._id, email, emailVerified: true, emailVerifiedAt: { $type: 'date' }, banned: { $ne: true } },
      { $set: { resetPasswordToken: crypto.createHash('sha256').update(resetToken).digest('hex'), resetPasswordExpires: new Date(Date.now()+3600000) } });
    if (!saved) return res.json({ message: 'If the email exists, a reset code has been sent' });

    try {
      await sendPasswordResetEmail(user.email, resetToken);
    } catch {
      // Do not disclose account existence, mail credentials, or the reset token.
      console.error('Password reset email delivery failed');
    }
    res.json({ message: 'If the email exists, a reset code has been sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Password reset request failed' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token) ||
        typeof password !== 'string' || password.length < 10 || Buffer.byteLength(password) > 72) {
      return res.status(400).json({ error: 'Invalid reset token or password' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.findOneAndUpdate({
      resetPasswordToken: crypto.createHash('sha256').update(token).digest('hex'),
      resetPasswordExpires: { $gt: Date.now() },
      emailVerified: true, emailVerifiedAt: { $type: 'date' },
      banned: { $ne: true }
    }, {
      $set: { passwordHash },
      $unset: { resetPasswordToken: '', resetPasswordExpires: '', refreshToken: '', previousRefreshTokenHash: '', previousRefreshExpires: '' },
      $inc: { tokenVersion: 1 }
    }, { new: true });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-refreshToken')
      .lean();
    const profile = await Profile.findOne({ userId: req.user._id }).lean();

    res.json({
      user: {
        id: user?._id,
        email: user?.email,
        username: user?.username,
        role: user?.role,
        emailVerified: isEmailVerified(user),
        identityVerified: hasVerifiedIdentity(user),
        loginMethods: { password: Boolean(user.passwordHash), google: Boolean(user.googleSub), telegram: Boolean(user.telegramSub) },
        telegramNotificationsEnabled: Boolean(user.telegramNotificationsEnabled),
        remainingSubjects: user?.remainingSubjects ?? [],
        remainingSubjectsConfirmed: user?.remainingSubjectsConfirmed === true,
        telegramLinked: user?.telegramLinked === true
      },
      profile
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
};
