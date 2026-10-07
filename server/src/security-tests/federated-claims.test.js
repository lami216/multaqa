import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeClaims } from '../services/federatedIdentityService.js';
test('Google verified external email is not automatically trusted as a mailbox', () => {
  assert.equal(
    normalizeClaims('google', {
      sub: 'subject',
      email: 'user@example.org',
      email_verified: true
    }).emailVerified,
    false
  );
  assert.equal(
    normalizeClaims('google', {
      sub: 'subject',
      email: 'user@gmail.com',
      email_verified: true
    }).emailVerified,
    true
  );
});
test('Telegram subject and bot user id remain separate, without inventing an email', () => {
  const identity = normalizeClaims('telegram', {
    sub: 'opaque-oidc-sub',
    id: 12345
  });
  assert.equal(identity.subject, 'opaque-oidc-sub');
  assert.equal(identity.telegramUserId, '12345');
  assert.equal(identity.email, undefined);
  assert.throws(() => normalizeClaims('telegram', { sub: 'opaque', id: -123 }));
});
