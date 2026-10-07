import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSocialEnvironment } from '../config/socialEnv.js';
test('providers remain optional, but partial credentials and unsafe production origins fail startup', () => {
  assert.doesNotThrow(() => validateSocialEnvironment({}));
  assert.throws(() => validateSocialEnvironment({ GOOGLE_CLIENT_ID: 'id' }));
  const env = {
    NODE_ENV: 'production',
    APP_URL: 'https://app.example.invalid',
    CORS_ORIGIN: 'https://app.example.invalid',
    GOOGLE_CLIENT_ID: 'id',
    GOOGLE_CLIENT_SECRET: 'secret'
  };
  assert.doesNotThrow(() => validateSocialEnvironment(env));
  assert.throws(() =>
    validateSocialEnvironment({ ...env, APP_URL: 'http://app.example.invalid' })
  );
  assert.throws(() =>
    validateSocialEnvironment({
      ...env,
      CORS_ORIGIN: 'https://other.example.invalid'
    })
  );
  assert.throws(() =>
    validateSocialEnvironment({
      ...env,
      APP_URL: 'https://app.example.invalid/path'
    })
  );
});
test('Telegram login and notifications cannot silently use different bots', () => {
  const env = {
    APP_URL: 'https://app.example.invalid',
    CORS_ORIGIN: 'https://app.example.invalid',
    TELEGRAM_CLIENT_ID: '123',
    TELEGRAM_CLIENT_SECRET: 'secret',
    TELEGRAM_BOT_TOKEN: '123:fixture',
    TELEGRAM_BOT_USERNAME: 'FixtureBot',
    TELEGRAM_WEBHOOK_SECRET: 'fixture-secret'
  };
  assert.doesNotThrow(() => validateSocialEnvironment(env));
  assert.throws(() =>
    validateSocialEnvironment({ ...env, TELEGRAM_BOT_TOKEN: '456:fixture' })
  );
});
