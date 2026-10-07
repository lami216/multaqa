import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { loadModule, response } from './helpers.js';
test('email signup does not falsely mark mailbox verified or disclose a token', async () => {
  let created,
    issued = 0;
  const m = await loadModule('../controllers/authController.js', {
    bcryptjs: { default: { hash: async () => 'hash' } },
    crypto: { default: crypto },
    '../config/redis.js': { default: { fixedWindow: async () => 1 } },
    '../utils/passwordResetEmail.js': {
      sendPasswordResetEmail: async () => {}
    },
    '../services/emailVerificationService.js': {
      issueVerification: async () => {
        issued++;
      },
      isEmailVerified: () => false,
      hasVerifiedIdentity: () => false
    },
    '../models/User.js': {
      default: {
        findOne: async () => null,
        create: async (data) => {
          created = { ...data, _id: 'u', save: async () => {} };
          return created;
        }
      }
    },
    '../models/Profile.js': { default: { create: async () => {} } },
    '../utils/jwt.js': {
      generateAccessToken: () => 'access',
      generateRefreshToken: () => 'refresh',
      verifyRefreshToken: () => null
    }
  });
  const res = response();
  await m.register(
    {
      body: {
        email: 'test@example.invalid',
        password: 'strong-password',
        username: 'student'
      }
    },
    res
  );
  assert.equal(res.statusCode, 201);
  assert.equal(created.emailVerified, false);
  assert.equal(created.verificationToken, undefined);
  assert.equal(issued, 1);
});
