# Verified email, Google and Telegram accounts

## Account policy

- Email/password signup creates an **unverified** mailbox. One confirmation email is requested at signup; normal login sends no email. Verification links expire after 30 minutes, contain a 256-bit random token in the URL fragment, and are consumed once by an atomic database update. Only the digest is stored. The browser clears the fragment before submitting it. Resends require an authenticated account, have a 60-second cooldown and three-attempt/hour mailbox limit, in addition to endpoint limits. SMTP failure does not disclose a token. Configure mail before enabling public email signup.
- Verification issuance cannot undo proof completed concurrently. The authoritative database predicate, not a previously loaded User, decides whether a new proof may be issued.
- Unverified password-only accounts may log in, confirm email and fill their profile, but cannot publish, message, perform protected mutations or obtain ImageKit upload signatures. Eligibility middleware is attached explicitly to each protected router/signature handler, not inferred from a raw URL string; case-insensitive aliases receive the same authorization checks. Google/Telegram identities verified by the provider are eligible to use the app without repeatedly checking email.
- Google and Telegram use Authorization Code + PKCE, state tied to an HttpOnly browser cookie, nonce, and issuer/audience/expiry/signature validation. `openid-client` performs the protocol checks; non-repudiation/signature verification is explicitly enabled. Fixed official endpoints are used; request input never determines an issuer or token endpoint. RS256 is required.
- Google identity is keyed by `sub`, never by email. Google `email_verified=true` is mailbox proof only for Gmail or Google Workspace (`hd`); other email domains require our own confirmation. The Google provider identity itself remains a valid login method while its external mailbox is pending.
- **Matching email never auto-links accounts.** If a claimed email already exists, sign into that account and explicitly associate the provider from `/account`. Linking requires a recently authenticated session (10 minutes), browser-bound authorization and an unchanged account/session version. Refresh preserves the original authentication time; it does not satisfy reauthentication. An old token without `authTime` is not upgraded to a recent authentication.
- Telegram signup requires neither a fabricated email nor a fabricated password. An opaque OIDC `sub` is stored separately from Telegram's signed numeric `id`. `id` is used only to associate the private bot sender. Do not substitute the subject, username or phone number for this numeric identifier. No phone scope or `telegram:bot_access` permission is requested.
- A Telegram-only user can add an optional email from `/account` after reauthentication. It is not usable for recovery until confirmed. A verified mailbox can receive a recovery link and establish a password. Password recovery never sends a challenge during normal login; it has per-IP and per-account limits.
- Removing a login method is an atomic operation, requires recent authentication and cannot remove the last usable method. A verified email **without an existing password** is not counted as a password login. Removing a provider revokes sessions; sign in again with another method.

## Bot notifications and consent

1. Successful Telegram login/signup records the verified identity, without enabling notifications.
2. `/account` offers a button opening the same Multaqa bot.
3. First private message, or `/start`, enables notifications by matching the verified numeric sender and private chat id. There is no code to copy for a Telegram-authenticated account.
4. `/stop` or the app's notification-disable action disables messages without removing Telegram login. After disabling, an ordinary message does not silently reactivate consent: send a **new** `/start`.
5. Consent is persisted and atomically ordered by Telegram event date then update id. Duplicates and out-of-order events cannot undo a newer decision. An event must be strictly newer than an app/API disable timestamp. Because Telegram timestamps have one-second resolution, same-second ambiguous restarts are conservatively rejected: retry `/start` after a second. Keep the server clock synchronized.
6. Bot blocking (`my_chat_member` kicked or sendMessage HTTP 403) disables notifications and suppresses later send retries. A fresh `/start` may re-enable them. Banned accounts do not receive business bot notifications. Removing a Telegram login method also stores an opt-out barrier, retained across later relinking: old messages cannot reactivate consent.
7. Existing six-character notification-link codes remain single-use/ten-minute compatibility links; they **never** become login identities. Both legacy links and official login use one unique `telegramOwnerId` reservation, so concurrent writes cannot split ownership between different accounts. A legacy account retains that reservation after `/stop` or bot blocking and may reactivate notifications with a fresh, ordered `/start`, without gaining a login identity. Legacy notification disconnect from the app releases its notification-only reservation and requires an explicit new link; bare `/start` cannot reclaim released ownership. Provider-backed notification disable keeps the login reservation.

## Configuration — never put secrets in the frontend

Use `server/.env.example`. Deploy frontend and API under the same HTTPS origin.

- `APP_URL`: canonical website origin, without a path/query/fragment, e.g. `https://your-domain.example`.
- `CORS_ORIGIN`: exactly the same origin.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: a Google Web OAuth client. Register exactly `https://your-domain.example/api/auth/google/callback`. Configure the consent screen, intended audience/test users and publishing status. Leave both empty to disable Google.
- `TELEGRAM_CLIENT_ID`, `TELEGRAM_CLIENT_SECRET`: obtain from **Login Widget in BotFather**, not from the Bot API token. Register the website origin and exact callback `https://your-domain.example/api/auth/telegram/callback`. Keep RS256 selected. Leave both empty to disable Telegram login.
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`: configure the **same** bot. Client id must equal the numeric bot-id prefix of the bot token. Startup rejects a mismatch. Set the webhook to `/api/telegram/webhook`, with `secret_token` matching the local secret and allowed updates including `message` and `my_chat_member`. Setting the local environment alone does not register the provider webhook.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`: dedicated SMTP credentials/from identity. Port 587 uses required STARTTLS; port 465 uses TLS. Verify sender/domain with the mail provider as required. Register SPF/DKIM/DMARC for a custom sender domain. Password and verification mail use URL fragments and no private tokens in query strings.
- Existing MongoDB, Redis, ImageKit and independent JWT secrets remain required. Use separate credentials from unrelated applications.

Provider credentials must be set as complete pairs. When social login is configured, startup rejects noncanonical origins, mismatched CORS and non-HTTPS production URLs. UI provider buttons appear only for enabled providers. A credential's mere presence does not prove it works: perform the live-provider checks below.

## Existing data and indexes

Back up the **project's own database** before upgrade. Do not point it at another project's database.

- The old app set `emailVerified=true` without confirmation. That flag alone is no longer proof: `emailVerifiedAt` must also exist. Old password accounts can sign in and confirm their mailbox before protected actions. Lost-password accounts lacking mailbox proof need a deliberate ownership/recovery procedure; do not blindly backfill every address as verified.
- Startup builds the unique partial `email_unique_present` index **before** dropping the old full `email_1` index. This preserves uniqueness while allowing multiple Telegram-only documents without an email. It drops only a unique, single-key, nonpartial legacy `email_1`; custom/incompatible indexes are not silently changed.
- Unique partial indexes protect Google subject, Telegram subject, numeric login id and the shared Telegram owner reservation. Owner reservations are backfilled from existing Telegram identities and active legacy notification links. An existing cross-account conflict causes startup failure and requires deliberate reconciliation; no account/data is deleted to make an index pass.
- Previously linked bot accounts retain their notification opt-in; absent notification flags are backfilled only where `telegramLinked=true`. A stored legacy bot link is not auto-converted into a provider login.
- AuthFlow has a five-minute TTL index. Consumption also checks expiry directly; delayed MongoDB TTL cleanup never makes an expired flow usable.

## Verification and release gate

Run on Node 22.12+:

```sh
npm test
npm run test:integration
npm run lint
pnpm audit --prod
npm audit --prefix server --omit=dev
```

Integration tests require OpenSSL and download a disposable MongoDB binary. `social-auth-smoke.mjs` uses actual MongoDB and HTTP handlers, actual STARTTLS SMTP delivery with a disposable locally trusted certificate, and explicitly signed local OAuth/Bot API fixtures. It exercises email hash/expiry/replay/binding, concurrent verification issuance, browser-bound flows, account collision and explicit linking, Telegram-only signup, consent replay/order/disable, blocked-send suppression, original authentication time, link revocation and forced dual-precheck ownership races. Production startup smoke additionally verifies the legacy email-index replacement, reservation/consent backfill without forging mailbox proof, multiple email-less accounts and lower/mixed/upper-case authorization. The Telegram suite covers delayed messages across unlink/relink and blocked business notification delivery after a ban. Test credentials and mail recipients are synthetic; no real provider or production database is used.

Before public release, separately verify:

- Real Google login/signup and explicit association, cancellation/denial, existing-email conflict and logout/relogin.
- Real Telegram login/signup with the configured bot, profile completion, `/start`, `/stop`, notification disable/re-enable and bot blocking; confirm the bot's actual username matches configuration.
- SMTP delivery to external mailboxes, sender identity, spam placement, verification/recovery expiry and acceptable quotas.
- TLS, correct proxy headers and callback routing, rate limits for expected shared-IP/campus traffic, and clock synchronization.
- Avoid logging OAuth callback query strings (code/state) in Nginx, application monitoring, analytics or error reporting; use a callback-safe access log format containing `$uri`, not `$request_uri`.
- VPS health/readiness, restart/reboot, upload/message behavior, backups and restore. No production merge/deployment is performed by these tests.
