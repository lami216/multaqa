# Multaqa Platform Development TODO

## Plan

### Phase 1: Project Setup & Structure
- [x] 1.1 Create project structure (client/server separation)
- [x] 1.2 Set up backend dependencies and configuration
- [x] 1.3 Set up frontend i18n (react-i18next) with Arabic RTL support
- [x] 1.4 Configure environment variables for both client and server
- [x] 1.5 Create Docker Compose configuration

### Phase 2: Backend Core Infrastructure
- [x] 2.1 Set up Express server with middleware (helmet, cors, cookie-parser)
- [x] 2.2 Configure MongoDB connection with Mongoose
- [x] 2.3 Set up Upstash Redis client for caching and rate limiting
- [x] 2.4 Create rate limiting middleware
- [x] 2.5 Create authentication middleware (JWT verification)
- [x] 2.6 Set up ImageKit configuration

### Phase 3: Database Models
- [x] 3.1 Create User model
- [x] 3.2 Create Profile model
- [x] 3.3 Create Post model with text indexes
- [x] 3.4 Create Chat model
- [x] 3.5 Create Message model
- [x] 3.6 Create Report model
- [x] 3.7 Create Notification model
- [x] 3.8 Create Faculty model

### Phase 4: Authentication System
- [x] 4.1 Implement registration endpoint with email verification structure
- [x] 4.2 Implement login endpoint with JWT tokens
- [x] 4.3 Implement refresh token endpoint
- [x] 4.4 Implement logout endpoint
- [x] 4.5 Implement forgot password endpoint
- [x] 4.6 Implement reset password endpoint
- [x] 4.7 Create auth context and hooks on frontend

### Phase 5: User Profile System
- [ ] 5.1 Create profile endpoints (get, update)
- [ ] 5.2 Implement ImageKit avatar upload
- [ ] 5.3 Create profile pages (view, edit)
- [ ] 5.4 Create avatar upload component
- [ ] 5.5 Implement profile caching with Redis

### Phase 6: Post Management System
- [ ] 6.1 Create post CRUD endpoints
- [ ] 6.2 Implement post search and filtering with MongoDB text index
- [ ] 6.3 Implement post caching with Redis
- [ ] 6.4 Create post creation/edit forms
- [ ] 6.5 Create post listing page with filters
- [ ] 6.6 Create post detail page
- [ ] 6.7 Implement profanity filter
- [ ] 6.8 Implement phone/email auto-masking

### Phase 7: Messaging System
- [ ] 7.1 Create chat endpoints (list, create/retrieve, messages)
- [ ] 7.2 Create message sending endpoint
- [ ] 7.3 Create chat report endpoint
- [ ] 7.4 Create messages inbox page
- [ ] 7.5 Create chat view component
- [ ] 7.6 Implement message pagination

### Phase 8: Notifications System
- [ ] 8.1 Create notification endpoints
- [ ] 8.2 Implement notification creation logic
- [ ] 8.3 Implement notification caching with Redis
- [ ] 8.4 Create notifications page
- [ ] 8.5 Create notification badge component

### Phase 9: Moderation & Admin System
- [ ] 9.1 Create report endpoints
- [ ] 9.2 Create admin endpoints (reports, ban users, delete posts)
- [ ] 9.3 Create faculty management endpoints
- [ ] 9.4 Create admin dashboard page
- [ ] 9.5 Create admin middleware for protected routes
- [ ] 9.6 Create admin seed script

### Phase 10: Frontend UI & Navigation
- [ ] 10.1 Design color scheme and update theme
- [ ] 10.2 Create navigation bar with language switcher
- [ ] 10.3 Create home page with hero and category cards
- [ ] 10.4 Create authentication pages (login, register, forgot password, reset password)
- [ ] 10.5 Implement protected routes
- [ ] 10.6 Create footer component

### Phase 11: Internationalization
- [ ] 11.1 Create Arabic translation file
- [ ] 11.2 Create French translation file
- [ ] 11.3 Implement RTL layout for Arabic
- [ ] 11.4 Test language switching

### Phase 12: Testing & Validation
- [ ] 12.1 Test all API endpoints
- [ ] 12.2 Test authentication flow
- [ ] 12.3 Test post creation and search
- [ ] 12.4 Test messaging system
- [ ] 12.5 Test admin dashboard
- [ ] 12.6 Test rate limiting
- [ ] 12.7 Test profanity filter
- [ ] 12.8 Run linting

### Phase 13: Documentation & Deployment
- [ ] 13.1 Create comprehensive README
- [ ] 13.2 Document API endpoints
- [ ] 13.3 Create .env.example files
- [ ] 13.4 Test Docker Compose setup
- [ ] 13.5 Final validation against acceptance criteria

## Notes
- This is a full-stack MERN application (NOT using Supabase)
- Backend: Node.js + Express + MongoDB + Redis
- Frontend: React + Vite + TypeScript + Tailwind + shadcn/ui
- Bilingual: Arabic (RTL) and French (LTR)
- Key integrations: ImageKit, Upstash Redis, MongoDB
