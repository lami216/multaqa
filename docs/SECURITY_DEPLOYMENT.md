# Security hardening and deployment

## Runtime and verification

Use Node.js 22.12+ (Node 22 LTS recommended). Install the root with `pnpm install --frozen-lockfile --ignore-scripts` (pnpm 10.34.6); install the backend with `npm ci --prefix server --ignore-scripts`. Run `npm test`, `npm run test:integration` (downloads an ephemeral MongoDB binary on first run), and `npm run lint` (typecheck, Biome, production build). The root pnpm lock and backend npm lock are both required.

Production serves the compiled frontend, never Vite's development/preview server. The API defaults to loopback. Run one instance behind Nginx + HTTPS, supervised by systemd/PM2. The sample Nginx configuration is an HTTP example: enable TLS with your existing certificate tooling before exposing this app. Set forwarding headers exactly as the sample; do not expose the backend publicly.

Copy `server/.env.example` to `server/.env` and populate independent provider credentials and unique strong access/refresh secrets (at least 32 characters). Never place private keys or passwords in VITE_ variables. Startup now loads configuration before dependent modules, rejects missing/unsafe production configuration, waits for MongoDB, and explicitly creates critical User/Profile uniqueness indexes. Existing duplicate records must be resolved before deployment; do not silently remove duplicates or bypass index errors.

## Behavioral changes

- Password recovery never returns a secret in HTTP. It stores a SHA-256 digest and emails the raw code with one-hour validity. SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD and SMTP_FROM are required for delivery. Without SMTP, no usable reset code is disclosed; delivery failures are logged without credentials or codes. There was no reset UI in the original app: recovery remains an API workflow (`POST /api/auth/forgot-password`, then `POST /api/auth/reset-password` with `token` and `password`); a user-facing reset form is a separate UI task.
- Reset passwords require at least 10 characters and at most 72 UTF-8 bytes. Reset is atomic/single-use and invalidates access and refresh sessions. Logout invalidates sessions too. Login updates are conditional/atomic on the observed password hash, token version and non-banned status, with explicit grace cleanup; a concurrent reset/logout cannot be overwritten by a stale login, including legacy accounts missing tokenVersion.
- Access and refresh JWTs have distinct purposes and unique IDs. Old JWTs without the new purpose field are invalid; users must log in again after upgrade. Old raw reset codes and legacy Telegram JWT links are intentionally rejected.
- Profile validation now uses its parsed result, dropping fields outside the schema (including ownership IDs).
- Login, registration, reset, post/message limits fail closed with 503 if Redis is unavailable. This prevents silent bypass but makes affected writes temporarily unavailable during Redis outages. Reads/caching retain their existing fallback behavior. Redis count+expiry and Telegram code reserve/consume are atomic.
- Telegram webhooks require TELEGRAM_WEBHOOK_SECRET. When registering the webhook with Telegram, set `secret_token` to the same value. Updating the environment alone does not update Telegram. Do not share this secret in chat. Codes remain six characters/ten minutes and single-use.
- Cookies use HttpOnly, Secure in production, and SameSite=Lax. Deploy frontend and API under one HTTPS origin; cross-site-cookie hosting is intentionally not the supported default.
- Frontend now actually refreshes expired access tokens and coalesces simultaneous refresh calls within one tab. Backend refresh rotation is conditional/atomic; for five seconds, the predecessor and successor both resolve to the same stored successor, preventing cross-tab response-order races. The predecessor is rejected after that bounded grace period; reset/logout clear grace state immediately.

## Docker Compose

The new Dockerfile builds static assets and includes them with the API in a non-root runtime image. `docker-compose.yml` publishes only `127.0.0.1:5000`; MongoDB has no published host port and enables authentication. A separate app user has only readWrite on the multaqa database. Copy `.env.example` to `.env` and set distinct random HEX passwords for MONGO_ROOT_PASSWORD and MONGO_APP_PASSWORD. Using hex avoids Mongo URI escaping problems. The init script applies only to an EMPTY Mongo volume: for an existing database perform a backed-up, explicit credential migration; do not delete the volume to make startup work.

Never point this deployment at another application's database. Back up data before migration. Check health, auth, roles, uploads, messaging, Telegram, SMTP, TLS, reboot/restart and restore procedure in staging before public release. No server deployment is included in this branch.

## Remaining dependency advisory and verification limits

The backend audit is clean after updates and the scoped ImageKit uuid override; ImageKit auth-signature API compatibility was exercised. One high advisory remains in `braces@3.0.3`, pulled by Tailwind 3's build/watch tooling. At verification, npm's latest braces release was still 3.0.3. Do not process untrusted glob patterns or run the dev watcher on a publicly accessible service. Tailwind/animation dependencies are development-only and absent from the final runtime image. Eliminating the build-tool warning requires a separately tested Tailwind 4 migration or an upstream patched release, not an unsafe forced override.

Production-mode HTTP smoke verification used an actual ephemeral MongoDB database and a local Redis REST test fixture. SMTP delivery, real Upstash/ImageKit upload/Telegram integration, HTTPS VPS deployment, and Docker image build need staging verification; they are not certified by unit tests. The bundled frontend has a size warning (~640 kB uncompressed), a performance improvement rather than a confirmed security issue.
