# Welcome to Your Miaoda Project
Miaoda Application Link URL
    URL:https://medo.dev/projects/app-87ib2pxmh5hd

# Multaqa | ملتقى

A bilingual (Arabic/French) full-stack web platform for University of Nouakchott students to connect and find study partners, graduation project teammates, and tutoring opportunities.

## 🧭 Local setup quick guide

Follow these steps to spin up the project locally without digging through the entire document:

1. **Environment variables**
   - Create a `server/.env` file with your backend secrets (Mongo connection string, JWT secrets, Redis/ImageKit keys, admin seed credentials). Use the variable names listed in the **Server Environment Variables** section below.
   - Create a root `.env` file for the frontend with at least:
     ```env
     VITE_API_URL=http://localhost:5000
     VITE_IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
     VITE_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id
     ```

2. **Install dependencies**
   ```bash
   pnpm install           # install root/frontend packages
   cd server && pnpm install  # install backend packages
   ```

3. **Run the apps**
   ```bash
   # backend (from /server)
   pnpm dev

   # frontend (from project root, in a second terminal)
   pnpm dev -- --host 0.0.0.0
   ```

4. **Access the stack**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

## 🚀 Production deployment (PM2 + Nginx on a VPS)

### What gets built
- **Frontend**: Vite (`pnpm build`) outputs static assets to `dist/`.
- **Backend**: Express entry file is `server/src/server.js` (port `5000` by default via `PORT`).
- In production, the backend can serve the compiled frontend (it mounts `dist/` when `NODE_ENV=production`), and Nginx can handle TLS/static delivery while proxying `/api` to the Node server.

### One-time server setup
```bash
sudo apt update && sudo apt install -y nginx
corepack enable                    # ensures pnpm is available
npm install -g pm2                 # process manager for Node
```

### Deploy the code
```bash
sudo mkdir -p /opt/multaqa
cd /opt/multaqa
git clone <repo-url> .

# Frontend
pnpm install --frozen-lockfile
pnpm build                         # creates /opt/multaqa/dist

# Backend
cd server
pnpm install --prod
cp .env.example .env               # then edit with production secrets (CORS_ORIGIN should be your domain)
NODE_ENV=production PORT=5000 pm2 start src/server.js \
  --name multaqa-api \
  --cwd /opt/multaqa/server
pm2 save                           # persist across restarts
```

### Configure Nginx
```bash
sudo cp /opt/multaqa/docs/nginx.conf.example /etc/nginx/sites-available/multaqa
sudo nano /etc/nginx/sites-available/multaqa
# - set server_name to your domain
# - ensure root points to /opt/multaqa/dist (or your chosen path)

sudo ln -sf /etc/nginx/sites-available/multaqa /etc/nginx/sites-enabled/multaqa
sudo nginx -t && sudo systemctl reload nginx
```

### How it serves traffic
- Nginx serves the Vite build from `/opt/multaqa/dist` and proxies `/api/*` to `http://127.0.0.1:5000` where PM2 keeps the Express server alive.
- The Express server also serves `dist/` as a fallback when `NODE_ENV=production`, so direct access via `http://server:5000` will still render the frontend.

### Updating an existing deployment
```bash
cd /opt/multaqa
git pull
pnpm install --frozen-lockfile
pnpm build
cd server && pnpm install --prod
pm2 restart multaqa-api
sudo systemctl reload nginx
```

## 🎯 Project Overview

Multaqa is a comprehensive academic collaboration platform that facilitates connections between students through:
- **Profile Matching**: Detailed student profiles with skills, courses, and availability
- **Post Creation**: Three categories (Study Partner, Project Team, Tutor Offer)
- **In-App Messaging**: Private 1-to-1 conversations
- **Notifications**: Real-time updates for messages and interactions
- **Admin Moderation**: Content moderation, user management, and reporting system

## 🛠 Technology Stack

### Backend
- **Runtime**: Node.js with Express
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (access + refresh tokens) with httpOnly cookies
- **Caching & Rate Limiting**: Upstash Redis
- **Image Storage**: ImageKit for profile avatars
- **Security**: Helmet, CORS, bcrypt password hashing

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v7
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Internationalization**: react-i18next (Arabic RTL + French LTR)
- **HTTP Client**: Axios with interceptors

### DevOps
- **Containerization**: Docker & Docker Compose
- **Environment Management**: dotenv

## 📁 Project Structure

```
/multaqa
├── server/                    # Backend Node.js application
│   ├── src/
│   │   ├── config/           # Database, Redis, ImageKit configuration
│   │   ├── controllers/      # Request handlers
│   │   ├── middleware/       # Auth, rate limiting, validation
│   │   ├── models/           # Mongoose schemas
│   │   ├── routes/           # API route definitions
│   │   ├── utils/            # Helper functions (JWT, profanity filter, etc.)
│   │   └── server.js         # Express app entry point
│   ├── .env.example          # Environment variables template
│   ├── package.json
│   └── Dockerfile
├── src/                       # Frontend React application
│   ├── components/           # React components
│   ├── contexts/             # React contexts (Auth)
│   ├── locales/              # i18n translation files (ar/fr)
│   ├── pages/                # Page components
│   ├── services/             # API service layer
│   ├── types/                # TypeScript type definitions
│   ├── i18n.ts               # i18n configuration
│   └── App.tsx               # Main app component
├── docker-compose.yml        # Multi-container orchestration
├── Dockerfile                # Frontend container
└── README.md
```

## ✅ Completed Backend Features

### Core Infrastructure
- ✅ Express server with security middleware (Helmet, CORS)
- ✅ MongoDB connection with Mongoose
- ✅ Upstash Redis client for caching and rate limiting
- ✅ ImageKit configuration for image uploads
- ✅ JWT authentication middleware
- ✅ Rate limiting middleware (login, register, post creation, messaging)
- ✅ Input validation with Zod schemas

### Database Models
- ✅ User model (email, password, username, role, banned status)
- ✅ Profile model (faculty, major, level, skills, courses, bio, avatar)
- ✅ Post model with text indexes for search
- ✅ Chat model (1-to-1 conversations)
- ✅ Message model
- ✅ Report model (for content moderation)
- ✅ Notification model
- ✅ Faculty model (bilingual faculty names)

### API Endpoints

#### Authentication (`/api/auth`)
- ✅ POST `/register` - User registration
- ✅ POST `/login` - User login with JWT
- ✅ POST `/refresh` - Refresh access token
- ✅ POST `/logout` - User logout
- ✅ POST `/forgot-password` - Password reset request
- ✅ POST `/reset-password` - Password reset with token
- ✅ GET `/me` - Get current user info

#### User Profile (`/api/users`)
- ✅ GET `/:username` - Get public profile
- ✅ PATCH `/me` - Update own profile
- ✅ POST `/avatar` - Upload avatar image

#### Posts (`/api/posts`)
- ✅ GET `/` - List posts with filters and pagination
- ✅ GET `/:id` - Get post details
- ✅ POST `/` - Create new post
- ✅ PATCH `/:id` - Update own post
- ✅ DELETE `/:id` - Delete own post
- ✅ POST `/:id/report` - Report post

#### Chat (`/api/chats`)
- ✅ GET `/` - List user's conversations
- ✅ POST `/` - Create or retrieve chat
- ✅ GET `/:chatId/messages` - Get message history
- ✅ POST `/:chatId/messages` - Send message
- ✅ POST `/:chatId/report` - Report chat

#### Notifications (`/api/notifications`)
- ✅ GET `/` - List notifications
- ✅ POST `/read` - Mark notifications as read
- ✅ GET `/unread-count` - Get unread count

#### Admin (`/api/admin`)
- ✅ GET `/reports` - List all reports
- ✅ PATCH `/reports/:id/resolve` - Resolve report
- ✅ DELETE `/posts/:id` - Delete any post
- ✅ PATCH `/users/:id/ban` - Ban/unban user
- ✅ GET `/faculties` - List faculties
- ✅ POST `/faculties` - Add faculty
- ✅ DELETE `/faculties/:id` - Remove faculty

### Security Features
- ✅ Profanity filter for Arabic and French
- ✅ Auto-masking of phone numbers and emails in posts
- ✅ Rate limiting on critical endpoints
- ✅ Redis caching for posts, profiles, and notification counts
- ✅ JWT token rotation
- ✅ Password hashing with bcrypt

### Utilities
- ✅ Admin seed script with default faculties
- ✅ Docker Compose configuration
- ✅ Environment variable templates

## ✅ Completed Frontend Features

### Core Setup
- ✅ i18n configuration with Arabic (RTL) and French (LTR)
- ✅ Translation files for both languages
- ✅ API service layer with Axios
- ✅ TypeScript type definitions
- ✅ Auth context with React hooks
- ✅ Automatic token refresh interceptor

## 🚧 Remaining Frontend Work

### Pages to Implement
- ⏳ Home page with hero section and category cards
- ⏳ Login page
- ⏳ Registration page
- ⏳ Forgot/Reset password pages
- ⏳ Post listing page with filters
- ⏳ Post detail page
- ⏳ Create/Edit post page
- ⏳ Profile view page
- ⏳ Profile edit page
- ⏳ Messages inbox page
- ⏳ Chat view page
- ⏳ Notifications page
- ⏳ Admin dashboard page

### Components to Implement
- ⏳ Navigation bar with language switcher
- ⏳ Post card component
- ⏳ Post filter sidebar
- ⏳ Avatar upload component
- ⏳ Tag input component
- ⏳ Message bubble component
- ⏳ Notification dropdown
- ⏳ Protected route wrapper
- ⏳ Admin route wrapper

### Features to Implement
- ⏳ RTL layout switching for Arabic
- ⏳ Message polling for real-time updates
- ⏳ Notification polling
- ⏳ Image upload with ImageKit
- ⏳ Form validation
- ⏳ Error handling with toast notifications

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- MongoDB instance (local or cloud)
- Upstash Redis account
- ImageKit account

### Environment Setup

#### Server Environment Variables
Create `server/.env` based on `server/.env.example`:

```env
MONGODB_URI=mongodb://localhost:27017/multaqa
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
COOKIE_DOMAIN=localhost
CORS_ORIGIN=http://localhost:5173
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token
IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id
ADMIN_SEED_EMAIL=admin@multaqa.mr
ADMIN_SEED_PASSWORD=securepassword
ADMIN_SEED_USERNAME=admin
```

#### Client Environment Variables
Create `.env` based on `.env.example`:

```env
VITE_API_URL=http://localhost:5000
VITE_IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
VITE_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id
```

### Installation

#### Option 1: Docker Compose (Recommended)

```bash
# Start all services
docker-compose up

# The application will be available at:
# Frontend: http://localhost:5173
# Backend: http://localhost:5000
# MongoDB: mongodb://localhost:27017
```

#### Option 2: Manual Setup

```bash
# Install backend dependencies
cd server
npm install

# Seed database with admin user and faculties
npm run seed

# Start backend server
npm start

# In a new terminal, install frontend dependencies
cd ..
npm install

# Start frontend development server
npm run dev
```

### Default Admin Credentials
After running the seed script:
- **Email**: admin@multaqa.mr
- **Password**: securepassword (or value from ADMIN_SEED_PASSWORD)
- **Username**: admin

## 📚 API Documentation

### Authentication Flow
1. User registers with email, password, and username
2. Server returns access token (short-lived) and sets refresh token in httpOnly cookie
3. Client stores access token in localStorage
4. On API requests, access token is sent in Authorization header
5. When access token expires, client automatically requests new token using refresh endpoint
6. Refresh token is rotated on each refresh request

### Rate Limits
- **Login**: 5 attempts per 15 minutes per IP
- **Registration**: 3 attempts per hour per IP
- **Post Creation**: 10 posts per hour per user
- **Message Sending**: 60 messages per minute per user

### Caching Strategy
- **Post Listings**: 30-60 seconds TTL, invalidated on create/update/delete
- **User Profiles**: 60 seconds TTL, invalidated on profile update
- **Unread Notification Count**: 30 seconds TTL, invalidated on new notification or mark as read

## 🎨 Design System

### Color Scheme
- **Primary**: Deep Blue (#1E40AF) - Trust and academia
- **Secondary**: Warm Orange (#F59E0B) - Energy and collaboration
- **Neutral**: Gray scale for backgrounds and text

### Typography
- Clean sans-serif font (Inter or Tajawal for Arabic support)
- Clear hierarchy with bold headings

### Layout
- Card-based design for posts and profiles
- Grid layout for post listings
- Single-column for chat and forms
- Rounded corners (8px border-radius)
- Subtle shadows for depth

## 🔒 Security Features

### Input Validation
- All endpoints validate input using Zod schemas
- Sanitization of user-generated content
- Auto-masking of phone numbers and emails in posts

### Content Moderation
- Profanity filter with configurable blacklist (Arabic & French)
- User reporting system for posts, users, and chats
- Admin dashboard for content moderation

### Authentication Security
- Refresh tokens in httpOnly cookies (CSRF protection)
- Access tokens with short expiration
- Password hashing with bcrypt (10+ salt rounds)
- Token rotation on refresh

## 🌍 Internationalization

### Supported Languages
- **Arabic (ar)**: Right-to-left (RTL) layout
- **French (fr)**: Left-to-right (LTR) layout

### Language Switching
- Language preference stored in localStorage
- Automatic layout direction switching
- All UI text translated in both languages

## 📝 Development Notes

### Backend Best Practices
- All database queries include error handling
- Consistent error response format
- Proper HTTP status codes
- Logging for errors and important events
- Input validation on all endpoints

### Frontend Best Practices
- TypeScript for type safety
- Component-based architecture
- Centralized API service layer
- Context API for global state
- Responsive design with Tailwind CSS

### Avatar upload quick test (Android Chrome)
- Ouvrir Profil > Modifier puis appuyer sur « Choisir une photo » pour voir l'option Caméra ou Galerie.
- Prendre une photo et choisir une image existante : l'aperçu doit se mettre à jour immédiatement dans l'avatar.
- Enregistrer puis actualiser / se reconnecter pour vérifier que l'avatar persiste sur toutes les vues (en-tête, profil).

## 🧪 Testing

### Backend Testing
```bash
cd server
npm test  # (Tests to be implemented)
```

### Frontend Testing
```bash
npm test  # (Tests to be implemented)
```

## 📦 Deployment

### Production Checklist
- [ ] Set strong JWT secrets
- [ ] Configure production MongoDB instance
- [ ] Set up Upstash Redis production instance
- [ ] Configure ImageKit production account
- [ ] Set CORS_ORIGIN to production domain
- [ ] Enable HTTPS
- [ ] Set secure cookie flags
- [ ] Configure environment variables
- [ ] Run database seed script
- [ ] Test all critical flows

## 🤝 Contributing

This is a university project for Université de Nouakchott students. Contributions are welcome!

## 📄 License

This project is licensed under the MIT License.

## 👥 Contact

For questions or support, please contact the development team.

---

**Note**: This project is currently in active development. The backend is fully implemented and functional. Frontend implementation is in progress.
