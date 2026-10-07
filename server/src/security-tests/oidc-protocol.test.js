import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { providerConfig, exchangeCode } from '../services/oidcService.js';
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048
});
const jwk = {
  ...publicKey.export({ format: 'jwk' }),
  kid: 'test-key',
  alg: 'RS256',
  use: 'sig'
};
const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const jwt = (claims) => {
  const data = `${b64({ alg: 'RS256', kid: 'test-key' })}.${b64(claims)}`;
  return `${data}.${crypto.sign('RSA-SHA256', Buffer.from(data), privateKey).toString('base64url')}`;
};
async function fixture(overrides = {}) {
  process.env.GOOGLE_CLIENT_ID = 'test-client';
  process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
  process.env.APP_URL = 'https://app.example.invalid';
  const { badSignature, algorithm, ...claimOverrides } = overrides;
  const claims = {
    iss: 'https://accounts.google.com',
    aud: 'test-client',
    sub: 'google-test-user',
    nonce: 'expected-nonce',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 300,
    ...claimOverrides
  };
  let sawVerifier = false;
  const config = providerConfig('google', async (url, options) => {
    if (String(url).includes('/certs')) return Response.json({ keys: [jwk] });
    assert.equal(
      new URLSearchParams(options.body).get('code_verifier'),
      'test-verifier'
    );
    sawVerifier = true;
    return Response.json({
      access_token: 'fixture-access',
      token_type: 'Bearer',
      id_token: badSignature
        ? jwt(claims).slice(0, -8) + 'AAAAAAAA'
        : algorithm
          ? `${b64({ alg: algorithm, kid: 'test-key' })}.${b64(claims)}.AAAAAAAA`
          : jwt(claims)
    });
  });
  return { config, sawVerifier: () => sawVerifier };
}
test('OIDC checks signed token and binds nonce/state/PKCE', async () => {
  const f = await fixture();
  const claims = await exchangeCode(
    f.config,
    new URL(
      'https://app.example.invalid/api/auth/google/callback?code=fixture&state=test-state'
    ),
    'test-state',
    { nonce: 'expected-nonce', verifier: 'test-verifier' }
  );
  assert.equal(claims.sub, 'google-test-user');
  assert(f.sawVerifier());
});
for (const [label, changes] of [
  ['nonce', { nonce: 'wrong' }],
  ['audience', { aud: 'attacker' }],
  ['issuer', { iss: 'https://attacker.invalid' }],
  ['expiry', { exp: 1 }],
  ['signature', { badSignature: true }],
  ['algorithm', { algorithm: 'HS256' }]
])
  test(`OIDC rejects incorrect ${label}`, async () => {
    const f = await fixture(changes);
    await assert.rejects(
      exchangeCode(
        f.config,
        new URL(
          'https://app.example.invalid/api/auth/google/callback?code=fixture&state=test-state'
        ),
        'test-state',
        { nonce: 'expected-nonce', verifier: 'test-verifier' }
      )
    );
  });
test('OIDC rejects mismatched state before exchanging code', async () => {
  const f = await fixture();
  await assert.rejects(
    exchangeCode(
      f.config,
      new URL(
        'https://app.example.invalid/api/auth/google/callback?code=fixture&state=wrong'
      ),
      'test-state',
      { nonce: 'expected-nonce', verifier: 'test-verifier' }
    )
  );
  assert.equal(f.sawVerifier(), false);
});
