import test from 'node:test';
import assert from 'node:assert/strict';
import User from '../models/User.js';
test('Telegram-only signup requires neither fake email nor fake password', () => {
  const user = new User({
    username: 'telegram-student',
    telegramSub: 'oidc-sub',
    telegramUserId: '1234'
  });
  assert.equal(user.validateSync(), undefined);
  assert.equal(user.email, undefined);
  assert.equal(user.passwordHash, undefined);
});
test('provider identifiers and verification hashes have safe schema/indexes', () => {
  assert(User.schema.path('googleSub'));
  assert(User.schema.path('telegramSub'));
  assert.equal(User.schema.path('verificationHash').options.select, false);
  const indexes = User.schema.indexes();
  assert(
    indexes.some(
      ([keys, options]) =>
        keys.email && options.unique && options.partialFilterExpression
    )
  );
});
