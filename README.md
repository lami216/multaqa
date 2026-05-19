# Multaqa | ملتقى

Multaqa is a bilingual Arabic/French academic collaboration platform for University of Nouakchott students. It helps students complete their profiles, find compatible study partners, form project teams, offer tutoring, continue private conversations, receive in-app/Telegram notifications, and manage academic availability from an admin console.

## Current platform state

The app is a full-stack React + Express platform with the main student workflows implemented:

- Student authentication with access/refresh JWT cookies and token refresh.
- Guided academic profile setup with faculty, level, major, semester, subjects, priorities, remaining subjects, avatar upload, and profile settings.
- Bilingual UI with Arabic RTL and French LTR layouts.
- Study partner, project team, and tutor-offer posts with search, filters, compatibility data, and join requests.
- Private one-to-one conversations created from direct messages or accepted join requests.
- Session lifecycle tools for active conversations, end-session requests, and ratings.
- In-app notifications with unread counts, navigation links, read state, duplicate prevention, and self-notification guards.
- Telegram account linking, disconnecting, deep links, manual `/start` fallback commands, and Telegram delivery for important notifications.
- Admin tools for academic settings, catalog visibility, faculties/majors/subjects, moderation, and platform stats.
- Responsive SaaS-style UI with mobile bottom navigation, desktop header navigation, settings modal, loading/error states, and polished cards/panels.

## Tech stack

### Frontend

- React 18 + TypeScript
- Vite
- React Router v7
- Tailwind CSS + shadcn/Radix-style UI primitives
- Axios HTTP client with refresh-token retry handling
- React contexts for auth, conversations, notifications, and language
- Arabic/French translations in `src/i18n/translations.ts`

### Backend

- Node.js + Express
- MongoDB + Mongoose
- JWT access/refresh authentication with httpOnly cookies
- Upstash Redis for caching, rate limiting, unread count cache, and short Telegram link tokens
- ImageKit for avatar uploads
- Zod validation
- Helmet, CORS, bcrypt, and content masking/profanity filtering

## Repository structure

```text
/multaqa
├── src/                         # React/Vite frontend
│   ├── components/              # Shared UI, layout, posts, subjects, admin shell
│   ├── context/                 # Auth, conversations, language, notifications
│   ├── hooks/                   # Smart polling and upload helpers
│   ├── i18n/                    # Arabic/French translation dictionary
│   ├── lib/                     # HTTP client, catalog helpers, utilities
│   └── pages/                   # App pages and route screens
├── server/                      # Express backend
│   ├── src/config/              # Database, Redis, ImageKit
│   ├── src/controllers/         # API handlers
│   ├── src/middleware/          # Auth, validation, rate limits
│   ├── src/models/              # Mongoose schemas
│   ├── src/routes/              # API routes
│   ├── src/services/            # Notifications, lifecycle, stats, matching
│   └── src/utils/               # JWT, Telegram, moderation helpers
├── public/                      # Static frontend assets
├── docs/                        # Deployment helpers, Nginx sample
├── docker-compose.yml           # Local container orchestration
├── Dockerfile                   # Frontend container
└── README.md
```

## Feature overview

### Profiles and settings

- Students can edit profile basics such as display name, bio, availability, and language preference from the profile settings modal.
- Academic identity fields are intentionally read-only in settings because they are managed by the full profile flow and academic catalog.
- Avatar uploads use ImageKit and cache-busted avatar URLs after changes.
- Remaining subjects can be saved for cross-level matching and profile completeness.

### Posts and matching

- Supported post categories:
  - Study partner
  - Project team
  - Tutor offer
- Posts support subject codes, academic metadata, availability dates, roles/activities, participant targets, and language/location preferences depending on category.
- Matching uses profile subjects, academic context, intent, and compatibility scoring.
- Join requests create notifications and, once accepted, open a conversation/session.

### Messaging and sessions

- Conversations can be direct or post-based.
- Messages track delivered/read status.
- Conversations have lifecycle expiry/extension controls.
- Accepted join requests initialize sessions.
- Session participants can request/confirm session end and submit ratings.

### Notification system

- Notifications are stored in MongoDB and surfaced in the notifications page, desktop header badge, and mobile bottom-nav badge.
- Unread counts are cached in Redis and invalidated when notifications are created or marked read.
- Read actions preserve notification history by updating `read`/`readAt` instead of deleting notification rows.
- Duplicate prevention checks existing unread notifications for the same recipient/type/relevant payload IDs.
- Self-notifications are guarded by actor/recipient checks.
- Notification links route users to conversations, posts, or profiles depending on notification payload.

### Telegram integration

- Users can connect Telegram from the profile settings modal.
- The backend creates short, single-use, Redis-backed Telegram link tokens that are safe for Telegram deep-link `start` parameters.
- The modal shows both a deep link and a manual `/start <token>` command fallback.
- Users can disconnect Telegram from the same settings modal.
- Important events can be sent to linked Telegram chats in Arabic and French with an app link when configured.

Required Telegram backend variable:

```env
TELEGRAM_BOT_TOKEN=123456:your_bot_token
```

Recommended public URL variable for Telegram notification links:

```env
APP_BASE_URL=https://your-domain.example
```

`FRONTEND_URL` or `PUBLIC_APP_URL` can also be used as a fallback for link generation.

### Multilingual and RTL/LTR support

- Arabic (`ar`) uses RTL layout behavior.
- French (`fr`) uses LTR layout behavior.
- Navigation, profile settings, notifications, Telegram linking, messages, home, posts, and common controls are translated.
- Language can be switched from the desktop header or mobile menu.

### UI/UX and responsiveness

- Desktop uses sticky glass-style header navigation.
- Mobile uses a fixed bottom navigation bar with unread message/notification badges.
- Core pages use responsive cards, panels, grids, and mobile-first spacing.
- Loading and error states are present for key async flows including notifications and profile/Telegram settings actions.

## Setup

### Prerequisites

- Node.js 20+
- pnpm 9+ or npm 10+
- MongoDB database
- Upstash Redis REST database
- ImageKit account
- Telegram bot token if Telegram linking/notifications are enabled

### Environment variables

Create `server/.env`:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/multaqa
CORS_ORIGIN=http://localhost:5173

JWT_ACCESS_SECRET=replace_me_access
JWT_REFRESH_SECRET=replace_me_refresh
JWT_TELEGRAM_SECRET=replace_me_telegram_optional
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

UPSTASH_REDIS_REST_URL=https://your-upstash-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id

TELEGRAM_BOT_TOKEN=your_telegram_bot_token
APP_BASE_URL=http://localhost:5173

# Weekly digest schedule (server local time)
WEEKLY_SUMMARY_ENABLED=true
WEEKLY_SUMMARY_DAY=0
WEEKLY_SUMMARY_HOUR=10
WEEKLY_SUMMARY_WINDOW_MINUTES=15

ADMIN_SEED_EMAIL=admin@multaqa.mr
ADMIN_SEED_PASSWORD=securepassword
ADMIN_SEED_USERNAME=admin
```

Weekly summary notifications are gated by a weekly scheduler window and persisted per user/week in MongoDB to prevent duplicates after restarts. Set `WEEKLY_SUMMARY_ENABLED=false` to disable digest sending until scheduler configuration is ready.

Create root `.env`:

```env
VITE_API_URL=http://localhost:5000
VITE_API_BASE_URL=http://localhost:5000
VITE_IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
VITE_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id
```

The frontend normalizes API base URLs so either `VITE_API_BASE_URL` or `VITE_API_URL` can point at the Express server.

### Install dependencies

Using pnpm:

```bash
pnpm install
cd server && pnpm install
```

Using npm:

```bash
npm install
cd server && npm install
```

### Run locally

Terminal 1, backend:

```bash
cd server
npm run dev
```

Terminal 2, frontend:

```bash
npm run dev -- --host 0.0.0.0
```

Open:

- Frontend: <http://localhost:5173>
- Backend API: <http://localhost:5000/api>

### Docker Compose

```bash
docker-compose up --build
```

Then open the frontend at <http://localhost:5173> and the API at <http://localhost:5000/api>.

## Useful commands

```bash
npm run build                 # Vite production build
npx tsgo -p tsconfig.check.json
npx biome lint
npm run lint                  # Typecheck, Biome, rules checks, Tailwind syntax, build script
```

Backend scripts:

```bash
cd server
npm start
npm run dev
```

## API areas

- `/api/auth` — register, login, refresh, logout, password reset, current user
- `/api/users` — profiles, settings, avatar, remaining subjects
- `/api/posts` — post CRUD, search/filtering, join requests, lifecycle actions
- `/api/conversations` — inbox, messages, read state, archive/pin/delete, extension
- `/api/sessions` — session lookup, end request/confirmation, ratings
- `/api/notifications` — list notifications, unread counts, mark one/all read
- `/api/telegram` — link token generation, webhook, disconnect
- `/api/admin` — moderation, academic catalog, settings, war dashboard stats
- `/api/faculties`, `/api/majors`, `/api/subjects`, `/api/academic-settings` — public catalog lookups

## Security and moderation

- Passwords are hashed with bcrypt.
- Access tokens are short-lived and refresh tokens rotate.
- Refresh/access cookies are httpOnly.
- Zod schemas validate request bodies.
- Helmet and CORS protect the Express surface.
- Rate limits protect auth, posts, and messaging endpoints.
- Contact information in posts is masked.
- Arabic/French profanity filters are applied to user-generated content.
- Admin moderation supports reports, post deletion, and user ban/unban.

## Deployment notes

1. Build the frontend with `npm run build` or `pnpm build`.
2. Start `server/src/server.js` with `NODE_ENV=production` and a process manager such as PM2.
3. Serve `dist/` with Nginx and proxy `/api/*` to the Express server.
4. Set production `CORS_ORIGIN`, strong JWT secrets, production Redis/Mongo/ImageKit credentials, and HTTPS cookie settings.
5. Configure the Telegram webhook to point to `/api/telegram/webhook` if Telegram linking is enabled.

Example PM2 start:

```bash
NODE_ENV=production PORT=5000 pm2 start server/src/server.js --name multaqa-api
```

## QA checklist for releases

- Typecheck and production build pass.
- Profile settings modal saves editable fields and shows failures.
- Telegram connect, manual command, deep link, webhook, and disconnect are verified.
- Notification read actions preserve history and update unread counts.
- Notification links navigate to the expected post, message, or profile.
- Arabic and French UI text remains translated.
- Mobile header/menu and bottom navigation remain usable at narrow widths.
- Users do not receive notifications for their own actions.
