import * as oidc from 'openid-client';
import crypto from 'node:crypto';
import AuthFlow from '../models/AuthFlow.js';
const endpoints = {
  google: {
    issuer: 'https://accounts.google.com',
    authorization_endpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    token_endpoint: 'https://oauth2.googleapis.com/token',
    jwks_uri: 'https://www.googleapis.com/oauth2/v3/certs'
  },
  telegram: {
    issuer: 'https://oauth.telegram.org',
    authorization_endpoint: 'https://oauth.telegram.org/auth',
    token_endpoint: 'https://oauth.telegram.org/token',
    jwks_uri: 'https://oauth.telegram.org/.well-known/jwks.json'
  }
};
export const digest = (value) =>
  crypto.createHash('sha256').update(value).digest('hex');
export const providerEnabled = (provider) =>
  Boolean(
    endpoints[provider] &&
    process.env[`${provider.toUpperCase()}_CLIENT_ID`] &&
    process.env[`${provider.toUpperCase()}_CLIENT_SECRET`] &&
    process.env.APP_URL
  );
export const callbackUri = (provider) =>
  new URL(`/api/auth/${provider}/callback`, process.env.APP_URL).href;
const cache = new Map();
export function providerConfig(provider, transport) {
  if (!providerEnabled(provider)) throw new Error('Provider not configured');
  if (!transport && cache.has(provider)) return cache.get(provider);
  const prefix = provider.toUpperCase();
  const secret = process.env[`${prefix}_CLIENT_SECRET`];
  const config = new oidc.Configuration(
    endpoints[provider],
    process.env[`${prefix}_CLIENT_ID`],
    { client_secret: secret, id_token_signed_response_alg: 'RS256' },
    provider === 'telegram'
      ? oidc.ClientSecretBasic(secret)
      : oidc.ClientSecretPost(secret)
  );
  config.timeout = 10;
  oidc.enableNonRepudiationChecks(config);
  if (transport) config[oidc.customFetch] = transport;
  else cache.set(provider, config);
  return config;
}
export async function beginFlow(provider, intent, user) {
  const config = providerConfig(provider);
  const state = crypto.randomBytes(32).toString('hex');
  const binding = crypto.randomBytes(32).toString('hex');
  const nonce = crypto.randomBytes(32).toString('hex');
  const verifier = oidc.randomPKCECodeVerifier();
  await AuthFlow.create({
    stateHash: digest(state),
    bindingHash: digest(binding),
    provider,
    intent,
    nonce,
    verifier,
    ...(intent === 'link'
      ? { userId: user._id, tokenVersion: user.tokenVersion ?? 0 }
      : {}),
    expiresAt: new Date(Date.now() + 300000)
  });
  const url = oidc.buildAuthorizationUrl(config, {
    redirect_uri: callbackUri(provider),
    scope: provider === 'google' ? 'openid email profile' : 'openid profile',
    state,
    nonce,
    code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
    code_challenge_method: 'S256',
    ...(provider === 'google' ? { prompt: 'select_account' } : {})
  });
  return { state, binding, url: url.href };
}
export async function takeFlow(provider, state, binding) {
  if (
    !['google', 'telegram'].includes(provider) ||
    typeof state !== 'string' ||
    !/^[a-f0-9]{64}$/.test(state) ||
    typeof binding !== 'string' ||
    !/^[a-f0-9]{64}$/.test(binding)
  )
    return null;
  return AuthFlow.findOneAndDelete({
    provider,
    stateHash: digest(state),
    bindingHash: digest(binding),
    expiresAt: { $gt: new Date() }
  }).select('+nonce +verifier');
}
export async function exchangeCode(config, currentUrl, state, flow) {
  const tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
    expectedState: state,
    expectedNonce: flow.nonce,
    pkceCodeVerifier: flow.verifier,
    idTokenExpected: true
  });
  const claims = tokens.claims();
  if (!claims) throw new Error('Missing verified identity');
  return claims;
}
