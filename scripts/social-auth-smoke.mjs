// Real MongoDB + HTTP routes + STARTTLS SMTP. OAuth and Bot API are explicit signed local fixtures, not live providers.
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SMTPServer } from '../server/node_modules/smtp-server/lib/smtp-server.js';
import express from '../server/node_modules/express/index.js';
import cookieParser from '../server/node_modules/cookie-parser/index.js';
import mongoose from '../server/node_modules/mongoose/index.js';
import * as oidc from '../server/node_modules/openid-client/build/index.js';
import crypto from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import authRoutes from '../server/src/routes/authRoutes.js';
import Profile from '../server/src/models/Profile.js';
import { loadModule, response } from '../server/src/security-tests/helpers.js';
import * as consent from '../server/src/services/telegramConsentService.js';
import telegramRoutes from '../server/src/routes/telegramRoutes.js';
import {
  authenticate,
  requireVerifiedIdentity
} from '../server/src/middleware/auth.js';
import User from '../server/src/models/User.js';
import AuthFlow from '../server/src/models/AuthFlow.js';
import { providerConfig } from '../server/src/services/oidcService.js';
import {
  generateAccessToken,
  verifyAccessToken
} from '../server/src/utils/jwt.js';
import { sendTelegramNotification } from '../server/src/utils/telegram.js';

if (!process.env.SOCIAL_TEST_TLS_DIR) {
  const dir = mkdtempSync(join(tmpdir(), 'multaqa-auth-test-'));
  try {
    execFileSync(
      'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'rsa:2048',
        '-nodes',
        '-days',
        '1',
        '-keyout',
        join(dir, 'key.pem'),
        '-out',
        join(dir, 'cert.pem'),
        '-subj',
        '/CN=127.0.0.1',
        '-addext',
        'subjectAltName=IP:127.0.0.1'
      ],
      { stdio: 'ignore' }
    );
    const child = spawn(
      process.execPath,
      ['--experimental-vm-modules', new URL(import.meta.url).pathname],
      {
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_ENV: 'test',
          NODE_EXTRA_CA_CERTS: join(dir, 'cert.pem'),
          SOCIAL_TEST_TLS_DIR: dir
        }
      }
    );
    const [code] = await once(child, 'exit');
    if (code !== 0) process.exitCode = code || 1;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
} else {
  let mongo, appServer;
  const mail = [],
    sent = [],
    counts = new Map(),
    codes = new Map();
  let botStatus = 200;
  const redis = createServer(async (req, res) => {
    let body = '';
    for await (const c of req) body += c;
    const c = JSON.parse(body);
    const n = (counts.get(c[3]) ?? 0) + 1;
    counts.set(c[3], n);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ result: n }));
  });
  const smtp = new SMTPServer({
    key: readFileSync(join(process.env.SOCIAL_TEST_TLS_DIR, 'key.pem')),
    cert: readFileSync(join(process.env.SOCIAL_TEST_TLS_DIR, 'cert.pem')),
    onAuth(auth, session, done) {
      assert.equal(auth.username, 'fixture-user');
      done(null, { user: 'fixture-user' });
    },
    onData(stream, session, done) {
      let body = '';
      stream.on('data', (c) => (body += c));
      stream.on('end', () => {
        mail.push({
          to: session.envelope.rcptTo[0].address,
          body: body
            .replace(/=\r?\n/g, '')
            .replace(/=([A-F0-9]{2})/g, (_, h) =>
              String.fromCharCode(parseInt(h, 16))
            )
        });
        done();
      });
    }
  });
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith('https://api.telegram.org/')) {
      sent.push(JSON.parse(options.body));
      return Response.json({ ok: botStatus === 200 }, { status: botStatus });
    }
    return realFetch(url, options);
  };
  try {
    Object.assign(process.env, {
      JWT_ACCESS_SECRET: 'fixture-access'.repeat(4),
      JWT_REFRESH_SECRET: 'fixture-refresh'.repeat(4),
      GOOGLE_CLIENT_ID: 'google-test-client',
      GOOGLE_CLIENT_SECRET: 'google-test-secret',
      TELEGRAM_CLIENT_ID: '123456',
      TELEGRAM_CLIENT_SECRET: 'telegram-test-secret',
      TELEGRAM_BOT_TOKEN: '123456:fixture-bot-token',
      TELEGRAM_BOT_USERNAME: 'MultaqaFixtureBot',
      TELEGRAM_WEBHOOK_SECRET: 'fixture-webhook-secret',
      SMTP_HOST: '127.0.0.1',
      SMTP_USER: 'fixture-user',
      SMTP_PASSWORD: 'fixture-password',
      SMTP_FROM: 'multaqa@example.invalid'
    });
    redis.listen(0, '127.0.0.1');
    await once(redis, 'listening');
    smtp.listen(0, '127.0.0.1');
    await once(smtp.server, 'listening');
    process.env.SMTP_PORT = String(smtp.server.address().port);
    process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${redis.address().port}`;
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fixture';
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri('social_auth_test'));
    await Promise.all([User.createIndexes(), AuthFlow.createIndexes()]);
    const app = express();
    app.use(express.json(), cookieParser());
    app.use('/api/auth', authRoutes);
    app.use('/api/telegram', telegramRoutes);
    app.post(
      '/api/posts/probe',
      authenticate,
      requireVerifiedIdentity,
      (req, res) => res.json({ ok: true })
    );
    app.use((error, req, res, next) =>
      res.status(500).json({ error: 'Fixture error' })
    );
    appServer = app.listen(0, '127.0.0.1');
    await once(appServer, 'listening');
    const origin = `http://127.0.0.1:${appServer.address().port}`;
    process.env.APP_URL = origin;
    process.env.CORS_ORIGIN = origin;
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048
    });
    const jwk = {
      ...publicKey.export({ format: 'jwk' }),
      kid: 'fixture-key',
      use: 'sig',
      alg: 'RS256'
    };
    const b64 = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');
    const sign = (claims) => {
      const data = `${b64({ alg: 'RS256', kid: jwk.kid })}.${b64(claims)}`;
      return `${data}.${crypto.sign('RSA-SHA256', Buffer.from(data), privateKey).toString('base64url')}`;
    };
    for (const p of ['google', 'telegram'])
      providerConfig(p)[oidc.customFetch] = async (url, options) => {
        if (
          String(url).includes('/certs') ||
          String(url).includes('/jwks.json')
        )
          return Response.json({ keys: [jwk] });
        const form = new URLSearchParams(options.body),
          record = codes.get(form.get('code'));
        assert(record, 'authorization code must exist');
        assert.equal(
          form.get('redirect_uri'),
          `${origin}/api/auth/${p}/callback`
        );
        assert.equal(
          await oidc.calculatePKCECodeChallenge(form.get('code_verifier')),
          record.challenge
        );
        if (p === 'telegram')
          assert.match(
            new Headers(options.headers).get('authorization'),
            /^Basic /
          );
        else
          assert.equal(
            form.get('client_secret'),
            process.env.GOOGLE_CLIENT_SECRET
          );
        const claims = {
          iss:
            p === 'google'
              ? 'https://accounts.google.com'
              : 'https://oauth.telegram.org',
          aud: process.env[`${p.toUpperCase()}_CLIENT_ID`],
          sub: record.subject,
          nonce: record.nonce,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 300,
          ...record.claims
        };
        return Response.json({
          access_token: 'local-provider-fixture',
          token_type: 'Bearer',
          id_token: sign(claims)
        });
      };
    const jar = () => new Map();
    const request = async (
      path,
      { body, token, cookies, method, headers } = {}
    ) => {
      const r = await fetch(origin + '/api' + path, {
        method: method || (body ? 'POST' : 'GET'),
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(cookies
            ? { Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; ') }
            : {}),
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined,
        redirect: 'manual'
      });
      for (const cookie of r.headers.getSetCookie()) {
        const [kv] = cookie.split(';'),
          at = kv.indexOf('=');
        if (cookies) {
          if (!kv.slice(at + 1)) cookies.delete(kv.slice(0, at));
          else cookies.set(kv.slice(0, at), kv.slice(at + 1));
        }
      }
      return {
        status: r.status,
        location: r.headers.get('location'),
        body: r.headers.get('content-type')?.includes('application/json')
          ? await r.json()
          : null
      };
    };
    const authorize = async (
      p,
      cookies,
      subject,
      claims = {},
      intent = 'start'
    ) => {
      const started = await request(`/auth/${p}/${intent}`, {
        body: {},
        cookies
      });
      assert.equal(started.status, 200);
      const u = new URL(started.body.url),
        code = crypto.randomBytes(16).toString('hex');
      codes.set(code, {
        subject,
        claims,
        nonce: u.searchParams.get('nonce'),
        challenge: u.searchParams.get('code_challenge')
      });
      const callback = `/auth/${p}/callback?state=${u.searchParams.get('state')}&code=${code}`;
      return { callback, state: u.searchParams.get('state') };
    };
    const localJar = jar();
    const registered = await request('/auth/register', {
      body: {
        email: 'local@example.invalid',
        username: 'local-student',
        password: 'local-password-123'
      },
      cookies: localJar
    });
    assert.equal(registered.status, 201);
    const initial = await request('/auth/me', { cookies: localJar });
    assert.equal(initial.body.user.emailVerified, false);
    assert.equal(initial.body.user.loginMethods.password, true);
    assert.equal(
      (await request('/posts/probe', { body: {}, cookies: localJar })).status,
      403
    );
    const delivered = mail.find((m) => m.to === 'local@example.invalid');
    assert(delivered, 'STARTTLS SMTP must deliver actual verification email');
    const raw = /token=([a-f0-9]{64})/.exec(delivered.body)?.[1];
    assert(raw);
    const stored = await User.findOne({
      email: 'local@example.invalid'
    }).select('+verificationHash');
    assert.equal(
      stored.verificationHash,
      crypto.createHash('sha256').update(raw).digest('hex')
    );
    assert(!JSON.stringify(initial.body).includes(raw));
    const confirmed = await Promise.all([
      request('/auth/verification/confirm', { body: { token: raw } }),
      request('/auth/verification/confirm', { body: { token: raw } })
    ]);
    assert.deepEqual(confirmed.map((r) => r.status).sort(), [200, 400]);
    assert.equal(
      (await request('/posts/probe', { body: {}, cookies: localJar })).status,
      200
    );
    const beforeMail = mail.length;
    await request('/auth/login', {
      body: { email: 'local@example.invalid', password: 'local-password-123' },
      cookies: localJar
    });
    assert.equal(mail.length, beforeMail, 'ordinary login must not send email');
    const expired = crypto.randomBytes(32).toString('hex');
    await User.updateOne(
      { _id: stored._id },
      {
        $set: {
          verificationHash: crypto
            .createHash('sha256')
            .update(expired)
            .digest('hex'),
          verificationEmail: stored.email,
          verificationExpires: new Date(Date.now() - 1)
        }
      }
    );
    assert.equal(
      (
        await request('/auth/verification/confirm', {
          body: { token: expired }
        })
      ).status,
      400
    );
    const wrongMailbox = crypto.randomBytes(32).toString('hex');
    await User.updateOne(
      { _id: stored._id },
      {
        $set: {
          verificationHash: crypto
            .createHash('sha256')
            .update(wrongMailbox)
            .digest('hex'),
          verificationEmail: 'other@example.invalid',
          verificationExpires: new Date(Date.now() + 10000)
        }
      }
    );
    assert.equal(
      (
        await request('/auth/verification/confirm', {
          body: { token: wrongMailbox }
        })
      ).status,
      400
    );
    // A Google identity claiming an existing mailbox never merges or logs into that account.
    const collisionJar = jar();
    let flow = await authorize('google', collisionJar, 'collision-google', {
      email: 'local@example.invalid',
      email_verified: true
    });
    let result = await request(flow.callback, { cookies: collisionJar });
    assert.match(result.location, /auth_error/);
    assert.equal((await User.findById(stored._id)).googleSub, undefined);
    flow = await authorize(
      'google',
      localJar,
      'local-google-linked',
      { email: 'different@gmail.com', email_verified: true },
      'link'
    );
    result = await request(flow.callback, { cookies: localJar });
    assert.equal(result.location, '/auth/complete');
    assert.equal(
      (await User.findById(stored._id)).email,
      'local@example.invalid'
    );
    // Wrong browser cannot consume the flow; correct browser can, exactly once.
    const googleJar = jar();
    flow = await authorize('google', googleJar, 'new-google-user', {
      email: 'newuser@gmail.com',
      email_verified: true
    });
    assert.match(
      (await request(flow.callback, { cookies: jar() })).location,
      /auth_error/
    );
    assert(
      await AuthFlow.exists({
        stateHash: crypto.createHash('sha256').update(flow.state).digest('hex')
      })
    );
    assert.equal(
      (await request(flow.callback, { cookies: googleJar })).location,
      '/auth/complete'
    );
    assert.match(
      (await request(flow.callback, { cookies: googleJar })).location,
      /auth_error/
    );
    assert.equal(
      (await request('/auth/me', { cookies: googleJar })).body.user
        .emailVerified,
      true
    );
    const telegramJar = jar();
    flow = await authorize('telegram', telegramJar, 'telegram-opaque-sub', {
      id: 987654321
    });
    assert.equal(
      (await request(flow.callback, { cookies: telegramJar })).location,
      '/auth/complete'
    );
    const tg = await User.findOne({ telegramSub: 'telegram-opaque-sub' });
    assert.equal(tg.email, undefined);
    assert.equal(tg.passwordHash, undefined);
    assert.equal(tg.telegramUserId, '987654321');
    assert.equal(tg.telegramLinked, false);
    const tgMe = await request('/auth/me', { cookies: telegramJar });
    assert.equal(tgMe.body.user.identityVerified, true);
    assert.equal(tgMe.body.user.loginMethods.password, false);
    assert.equal(
      (
        await request('/auth/telegram/link', {
          method: 'DELETE',
          cookies: telegramJar
        })
      ).status,
      409,
      'last login method cannot be removed'
    );
    let nextUpdate = 100;
    const webhook = async (body) => {
      await new Promise((resolve) => setTimeout(resolve, 1100));
      const event = body.message || body.my_chat_member;
      const update = { update_id: nextUpdate++, ...body };
      if (event) event.date ??= Math.floor(Date.now() / 1000);
      return request('/telegram/webhook', {
        body: update,
        headers: {
          'X-Telegram-Bot-Api-Secret-Token': process.env.TELEGRAM_WEBHOOK_SECRET
        }
      });
    };
    // Retained legacy notification consent may restart, but never becomes login proof.
    const legacyConsent = await User.create({
      email: 'legacy-consent@example.invalid',
      username: 'legacy-consent',
      passwordHash: 'fixture-hash',
      telegramChatId: '445566778',
      telegramOwnerId: '445566778',
      telegramLinked: true,
      telegramNotificationsEnabled: true
    });
    const legacyMessage = (text) => ({
      message: {
        from: { id: 445566778 },
        chat: { id: 445566778, type: 'private' },
        text
      }
    });
    await webhook(legacyMessage('/stop'));
    assert.equal((await User.findById(legacyConsent._id)).telegramNotificationsEnabled, false);
    await webhook(legacyMessage('hello'));
    assert.equal((await User.findById(legacyConsent._id)).telegramNotificationsEnabled, false);
    const replayLegacyStart = legacyMessage('/start');
    await webhook(replayLegacyStart);
    let legacyState = await User.findById(legacyConsent._id);
    assert.equal(legacyState.telegramNotificationsEnabled, true, 'retained legacy owner can restart with /start');
    assert.equal(legacyState.telegramSub, undefined, 'notification consent never grants a login identity');
    assert.equal(legacyState.telegramUserId, undefined);
    await webhook(legacyMessage('/stop'));
    await webhook(replayLegacyStart);
    assert.equal((await User.findById(legacyConsent._id)).telegramNotificationsEnabled, false, 'old legacy start cannot undo a newer stop');
    await webhook(legacyMessage('/start'));
    assert.equal((await User.findById(legacyConsent._id)).telegramNotificationsEnabled, true);
    // Disconnect releases legacy ownership; bare start must not reclaim it.
    const legacyCookies = jar();
    legacyCookies.set('accessToken', generateAccessToken(legacyConsent._id, 0));
    assert.equal((await request('/telegram/link', { method: 'DELETE', cookies: legacyCookies })).status, 200);
    await webhook(legacyMessage('/start'));
    legacyState = await User.findById(legacyConsent._id);
    assert.equal(legacyState.telegramNotificationsEnabled, false, 'released ownership needs an explicit new link');
    assert.equal(legacyState.telegramSub, undefined);
    await webhook({
      message: {
        from: { id: 987654321 },
        chat: { id: -10, type: 'group' },
        text: '/start'
      }
    });
    assert.equal((await User.findById(tg._id)).telegramLinked, false);
    await webhook({
      message: {
        from: { id: 987654321 },
        chat: { id: 987654322, type: 'private' },
        text: '/start'
      }
    });
    assert.equal((await User.findById(tg._id)).telegramLinked, false);
    await webhook({
      message: {
        from: { id: 987654321 },
        chat: { id: 987654321, type: 'private' },
        text: 'hello'
      }
    });
    assert.equal(
      (await User.findById(tg._id)).telegramNotificationsEnabled,
      true
    );
    await request('/telegram/link', { method: 'DELETE', cookies: telegramJar });
    assert.equal(
      (await User.findById(tg._id)).telegramSub,
      'telegram-opaque-sub'
    );
    assert.equal(
      (await User.findById(tg._id)).telegramNotificationsEnabled,
      false
    );
    await webhook({
      message: {
        from: { id: 987654321 },
        chat: { id: 987654321, type: 'private' },
        text: 'hello'
      }
    });
    assert.equal(
      (await User.findById(tg._id)).telegramNotificationsEnabled,
      false,
      'disabled notifications do not silently reactivate'
    );
    await webhook({
      message: {
        from: { id: 987654321 },
        chat: { id: 987654321, type: 'private' },
        text: '/start'
      }
    });
    assert.equal(
      (await User.findById(tg._id)).telegramNotificationsEnabled,
      true
    );
    botStatus = 403;
    await sendTelegramNotification(tg._id, 'fixture notification');
    assert.equal(
      (await User.findById(tg._id)).telegramNotificationsEnabled,
      false
    );
    const sentCount = sent.length;
    await sendTelegramNotification(tg._id, 'fixture notification');
    assert.equal(sent.length, sentCount, 'blocked bot is not retried');
    botStatus = 200;
    await webhook({
      message: {
        from: { id: 987654321 },
        chat: { id: 987654321, type: 'private' },
        text: '/start'
      }
    });
    await webhook({
      message: {
        from: { id: 987654321 },
        chat: { id: 987654321, type: 'private' },
        text: '/stop'
      }
    });
    assert.equal(
      (await User.findById(tg._id)).telegramNotificationsEnabled,
      false
    );
    // Old /start delivery cannot undo a newer /stop or an API disable.
    const oldStart = {
      update_id: 1000,
      message: {
        from: { id: 987654321 },
        chat: { id: 987654321, type: 'private' },
        text: '/start'
      }
    };
    await webhook(oldStart);
    await webhook({
      update_id: 1001,
      message: {
        from: { id: 987654321 },
        chat: { id: 987654321, type: 'private' },
        text: '/stop'
      }
    });
    await webhook(oldStart);
    assert.equal(
      (await User.findById(tg._id)).telegramNotificationsEnabled,
      false,
      'duplicate old start must not undo stop'
    );
    const delayedStart = {
      update_id: 1002,
      message: {
        from: { id: 987654321 },
        chat: { id: 987654321, type: 'private' },
        text: '/start',
        date: Math.floor(Date.now() / 1000)
      }
    };
    await request('/telegram/link', { method: 'DELETE', cookies: telegramJar });
    await webhook(delayedStart);
    assert.equal(
      (await User.findById(tg._id)).telegramNotificationsEnabled,
      false,
      'previously unseen old start must not undo API disable'
    );
    await webhook({
      update_id: 1003,
      message: {
        from: { id: 987654321 },
        chat: { id: 987654321, type: 'private' },
        text: '/start'
      }
    });
    assert.equal(
      (await User.findById(tg._id)).telegramNotificationsEnabled,
      true,
      'fresh start may enable notifications again'
    );
    await webhook({
      update_id: 1002,
      message: {
        from: { id: 987654321 },
        chat: { id: 987654321, type: 'private' },
        text: '/stop',
        date: delayedStart.message.date
      }
    });
    assert.equal(
      (await User.findById(tg._id)).telegramNotificationsEnabled,
      true,
      'out-of-order stop cannot override newer consent'
    );
    // Refresh must not make an old session look recently authenticated.
    const oldAuth = generateAccessToken(
      stored._id,
      0,
      Math.floor(Date.now() / 1000) - 3600
    );
    assert.equal(
      (await request('/auth/telegram/link', { body: {}, token: oldAuth }))
        .status,
      403
    );
    const authTime = verifyAccessToken(localJar.get('accessToken')).authTime;
    const refreshed = await request('/auth/refresh', {
      body: {},
      cookies: localJar
    });
    assert.equal(
      verifyAccessToken(refreshed.body.accessToken).authTime,
      authTime
    );
    assert.equal(
      (
        await request('/auth/email', {
          body: { email: 'attached@example.invalid' },
          cookies: telegramJar,
          headers: { Origin: 'https://evil.example.invalid' }
        })
      ).status,
      403
    );
    assert.equal(
      (
        await request('/auth/email', {
          body: { email: 'attached@example.invalid' },
          cookies: telegramJar
        })
      ).status,
      200
    );
    assert.equal((await User.findById(tg._id)).emailVerified, false);
    // A paused resend must not undo a mailbox proof consumed meanwhile.
    const raceRaw = 'c'.repeat(64);
    const raceUser = await User.create({
      email: 'verify-race@example.invalid',
      username: 'verify-race',
      passwordHash: 'fixture-hash',
      emailVerified: false,
      verificationHash: crypto
        .createHash('sha256')
        .update(raceRaw)
        .digest('hex'),
      verificationEmail: 'verify-race@example.invalid',
      verificationExpires: new Date(Date.now() + 60000)
    });
    let resumeIssue, enteredIssue;
    const issuedGate = new Promise((resolve) => (resumeIssue = resolve)),
      enteredGate = new Promise((resolve) => (enteredIssue = resolve));
    let raceMails = 0;
    const verification = await loadModule(
      '../services/emailVerificationService.js',
      {
        'node:crypto': { default: crypto },
        '../models/User.js': { default: User },
        '../config/redis.js': {
          default: {
            fixedWindow: async () => {
              enteredIssue();
              await issuedGate;
              return 1;
            }
          }
        },
        '../utils/passwordResetEmail.js': {
          sendEmailVerification: async () => {
            raceMails++;
          }
        }
      }
    );
    const pendingIssue = verification.issueVerification(raceUser);
    await enteredGate;
    assert.equal(
      (
        await request('/auth/verification/confirm', {
          body: { token: raceRaw }
        })
      ).status,
      200
    );
    resumeIssue();
    assert.equal(await pendingIssue, false);
    assert.equal((await User.findById(raceUser._id)).emailVerified, true);
    assert.equal(raceMails, 0);
    // Force both legacy and OIDC ownership prechecks to pass before racing real MongoDB writes.
    const oidcOwner = await User.create({
      email: 'oidc-owner@example.invalid',
      username: 'oidc-owner',
      passwordHash: 'fixture-hash'
    });
    const legacyOwner = await User.create({
      email: 'legacy-owner@example.invalid',
      username: 'legacy-owner',
      passwordHash: 'fixture-hash'
    });
    let checked = 0,
      releaseClaims;
    const claimsGate = new Promise((resolve) => (releaseClaims = resolve));
    const realUser = {
      findOneAndUpdate: User.findOneAndUpdate.bind(User),
      exists: async (query) => {
        const found = await User.exists(query);
        if (++checked === 2) releaseClaims();
        await claimsGate;
        return found;
      }
    };
    const identityService = await loadModule(
      '../services/federatedIdentityService.js',
      {
        'node:crypto': { default: crypto },
        '../models/User.js': { default: realUser },
        '../models/Profile.js': { default: Profile },
        './emailVerificationService.js': { issueVerification: async () => {} }
      }
    );
    const legacyController = await loadModule(
      '../controllers/telegramController.js',
      {
        'node:crypto': { timingSafeEqual: crypto.timingSafeEqual },
        '../models/User.js': { default: realUser },
        '../services/telegramConsentService.js': consent,
        '../utils/telegram.js': {
          createTelegramLinkToken: async () => null,
          getUserIdFromTelegramLinkToken: async () => String(legacyOwner._id),
          sendTelegramMessageToChat: async () => true
        }
      }
    );
    const collisionRes = response();
    await Promise.allSettled([
      identityService.resolveIdentity(
        {
          provider: 'telegram',
          subject: 'ownership-race-sub',
          telegramUserId: '888999111'
        },
        { intent: 'link', userId: oidcOwner._id, tokenVersion: 0 },
        {
          userId: String(oidcOwner._id),
          tokenVersion: 0,
          authTime: Math.floor(Date.now() / 1000)
        }
      ),
      legacyController.webhook(
        {
          headers: {
            'x-telegram-bot-api-secret-token':
              process.env.TELEGRAM_WEBHOOK_SECRET
          },
          body: {
            update_id: 9999,
            message: {
              date: Math.floor(Date.now() / 1000),
              from: { id: 888999111 },
              chat: { id: 888999111, type: 'private' },
              text: '/start ABCDEF'
            }
          }
        },
        collisionRes
      )
    ]);
    assert.equal(
      await User.countDocuments({ telegramOwnerId: '888999111' }),
      1
    );
    assert.notEqual(
      Boolean((await User.findById(oidcOwner._id)).telegramSub),
      Boolean((await User.findById(legacyOwner._id)).telegramLinked),
      'one shared owner index forbids split identity/notification owners'
    );
    // A ban also blocks the bot channel, not only HTTP login.
    await webhook({
      update_id: 1500,
      message: {
        from: { id: 987654321 },
        chat: { id: 987654321, type: 'private' },
        text: '/start'
      }
    });
    await User.updateOne({ _id: tg._id }, { $set: { banned: true } });
    const sentBeforeBan = sent.length;
    assert.equal(
      await sendTelegramNotification(tg._id, 'banned-user fixture'),
      false
    );
    assert.equal(
      sent.length,
      sentBeforeBan,
      'banned accounts must not receive bot notifications'
    );
    await User.updateOne({ _id: tg._id }, { $set: { banned: false } });
    // Unlink/relink preserves notification revocation across previously unseen old messages.
    flow = await authorize(
      'telegram',
      localJar,
      'cycle-sub',
      { id: 112233444 },
      'link'
    );
    assert.equal(
      (await request(flow.callback, { cookies: localJar })).location,
      '/auth/complete'
    );
    await webhook({
      update_id: 2000,
      message: {
        from: { id: 112233444 },
        chat: { id: 112233444, type: 'private' },
        text: '/start'
      }
    });
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const oldCycleMessage = {
      update_id: 2001,
      message: {
        date: Math.floor(Date.now() / 1000),
        from: { id: 112233444 },
        chat: { id: 112233444, type: 'private' },
        text: 'hello'
      }
    };
    const beforeUnlinkToken = localJar.get('accessToken');
    assert.equal(
      (
        await request('/auth/telegram/link', {
          method: 'DELETE',
          cookies: localJar
        })
      ).status,
      200
    );
    assert.equal(
      (await request('/auth/me', { token: beforeUnlinkToken })).status,
      401
    );
    flow = await authorize('google', localJar, 'local-google-linked', {
      email: 'different@gmail.com',
      email_verified: true
    });
    assert.equal(
      (await request(flow.callback, { cookies: localJar })).location,
      '/auth/complete'
    );
    flow = await authorize(
      'telegram',
      localJar,
      'cycle-sub',
      { id: 112233444 },
      'link'
    );
    assert.equal(
      (await request(flow.callback, { cookies: localJar })).location,
      '/auth/complete'
    );
    await webhook(oldCycleMessage);
    assert.equal(
      (await User.findById(stored._id)).telegramNotificationsEnabled,
      false,
      'old message cannot undo unlink/relink opt-out'
    );
    await webhook({
      update_id: 2002,
      message: {
        from: { id: 112233444 },
        chat: { id: 112233444, type: 'private' },
        text: '/start'
      }
    });
    assert.equal(
      (await User.findById(stored._id)).telegramNotificationsEnabled,
      true,
      'fresh start after relink enables notifications'
    );
    // Expired states and revoked account-link flows cannot create a new login method.
    flow = await authorize(
      'telegram',
      localJar,
      'revoked-flow-sub',
      { id: 123456789 },
      'link'
    );
    await request('/auth/logout', { body: {}, cookies: localJar });
    assert.match(
      (await request(flow.callback, { cookies: localJar })).location,
      /auth_error/
    );
    assert.equal((await User.findById(stored._id)).telegramSub, 'cycle-sub');
    const expiredJar = jar();
    flow = await authorize('telegram', expiredJar, 'expired-sub', {
      id: 123456780
    });
    await AuthFlow.updateOne(
      {
        stateHash: crypto.createHash('sha256').update(flow.state).digest('hex')
      },
      { $set: { expiresAt: new Date(Date.now() - 1) } }
    );
    assert.match(
      (await request(flow.callback, { cookies: expiredJar })).location,
      /auth_error/
    );
    console.log(
      'PASS: social-auth HTTP/MongoDB integration; actual STARTTLS SMTP verification delivery; hash storage, atomic/replay/expiry/mailbox binding; no login-email; Google collision/explicit linking/browser-bound state; Telegram-only registration, private-bot matching, opt-in/out, blocked-send suppression; original authTime and link revocation. OAuth and Bot API responses are signed/local test fixtures, not live-provider tests.'
    );
  } finally {
    globalThis.fetch = realFetch;
    if (appServer) await new Promise((r) => appServer.close(r));
    await mongoose.disconnect();
    if (mongo) await mongo.stop();
    await new Promise((r) => smtp.close(r));
    await new Promise((r) => redis.close(r));
  }
}
