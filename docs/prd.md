# Multaqa | ملتقى Requirements Document

## 1. Application Overview

### 1.1 Application Name
Multaqa | ملتقى

### 1.2 Application Description
A bilingual (Arabic/French) full-stack web platform designed for University of Nouakchott students to connect and find study partners, graduation project teammates, and tutoring opportunities. The platform facilitates academic collaboration through profile matching, post creation, and in-app messaging.

### 1.3 Target Users
Students enrolled at Université de Nouakchott across all faculties and academic levels (L1/L2/L3/M1/M2).

---

## 2. Technical Stack

### 2.1 Frontend
- Framework: React (Vite)
- Routing: React Router
- Styling: TailwindCSS\n- Internationalization: react-i18next (Arabic RTL + French LTR)
\n### 2.2 Backend
- Runtime: Node.js\n- Framework: Express
- Database: MongoDB with Mongoose ODM
- Authentication: JWT (access + refresh tokens) with httpOnly cookies
- Caching & Rate Limiting: Upstash Redis
- Image Storage: ImageKit (profile avatars and post attachments)
\n### 2.3 Deployment
- Containerization: Docker Compose for application and backend
- Configuration: .env.example files for both client and server
- MongoDB: External or configurable instance

---
\n## 3. Core Features\n
### 3.1 User Authentication
- Sign up with email and password
- Email verification via token link (structure included, skip option available)
- Login with JWT-based session management
- Password reset flow (forgot password → email token → reset)\n- Logout with token invalidation
- Refresh token rotation using httpOnly cookies

### 3.2 Student Profile Management
**Profile Fields:**
- Full name (optional display name)
- Username (required, unique)
- Email (verified or unverified)
- University: Université de Nouakchott (hardcoded)
- Faculty/School (admin-managed dropdown list)
- Major/Specialty (free text input)
- Academic Level: L1, L2, L3, M1, M2
- Skills (tag-based input)
- Current Courses (tag-based input)
- Availability (days/time as text)
- Languages: Arabic, French, or both
- Bio (text area)
- Avatar Image (uploaded via ImageKit)

**Profile Actions:**
- View own profile
- Edit profile information
- Upload/update avatar image
- Public profile view by username
\n### 3.3 Post Creation & Management
**Post Categories:**
1. Study partner / شريك مراجعة
2. Graduation project team / فريق مشروع تخرج
3. Tutor offer / عرض تدريس\n\n**Post Fields:**
- Title\n- Description
- Category (one of the three above)
- Tags (course names or skills)
- Faculty
- Academic Level
- Location (campus or online)
- Preferred Language (Arabic/French)
- Contact Preference: in-app chat only

**Post Actions:**
- Create new post
- Edit own post
- Delete own post (or admin delete)
- Report post for moderation
\n### 3.4 Post Discovery
**Search & Filter Options:**
- Filter by category
- Filter by faculty
- Filter by academic level
- Filter by tags (skills/courses)
- Filter by preferred language
- Sort by newest\n- Full-text search on title, description, and tags (MongoDB text index)

**Display:**
- Paginated post listing
- Post detail view with author profile preview
- Call-to-action: 'Message the author' button

### 3.5 In-App Messaging\n**Chat Features:**
- 1-to-1 private conversations
- Initiate chat from post or user profile
- Real-time updates (polling-based if WebSockets not implemented)
- Message history with pagination
- Block user option
- Report chat/message for moderation

**Chat Flow:**
- User clicks'Message' on a post or profile
- System creates or retrieves existing chat between two users
- Messages stored with timestamp and sender info
- Unread message indicators

### 3.6 Notifications
**Notification Types:**
- New message received
- Someone initiated chat from your post
- Post-related interactions (optional expansion)

**Notification Management:**
- Notification list view
- Mark as read functionality
- Unread count cached in Redis
- Stored in MongoDB\n
### 3.7Moderation & Safety
**User Actions:**
- Report post (with reason and details)
- Report user (with reason and details)
- Report chat/message\n\n**Admin Dashboard:**
- View all reports (posts, users, chats)
- Resolve reports\n- Delete posts\n- Ban/unban users
- Manage faculty list (add/edit/delete)

**Anti-Spam Measures:**
- Rate limiting on:\n  - Login attempts
  - Registration\n  - Post creation
  - Chat message sending
- Profanity filter (configurable blacklist) for Arabic and French in posts and messages
- Auto-detection and masking of phone numbers and emails in post content (encourage in-app chat)
\n---

## 4. User Roles

### 4.1 User (Default)
- Create and manage profile
- Create, edit, delete own posts
- Search and browse posts
- Send and receive messages
- Report content
- Receive notifications
\n### 4.2 Admin
- All user permissions
- Access admin dashboard
- View and resolve reports
- Delete any post
- Ban/unban users
- Manage faculty list\n- Seedable from environment variable

---

## 5. API Endpoints

### 5.1 Authentication
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/refresh
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
- GET /api/auth/me

### 5.2 User Profile
- GET /api/users/:username (public profile view)
- PATCH /api/users/me (update own profile)
- POST /api/uploads/avatar (ImageKit upload handling)
\n### 5.3 Posts
- GET /api/posts (with filters and pagination)
- POST /api/posts (create new post)
- GET /api/posts/:id (post details)
- PATCH /api/posts/:id (edit own post, owner or admin)
- DELETE /api/posts/:id (delete post, owner or admin)
- POST /api/posts/:id/report (report post)

### 5.4 Chat
- GET /api/chats (list user's conversations)
- POST /api/chats (create or retrieve chat between two users, optional postId)
- GET /api/chats/:chatId/messages (paginated message history)
- POST /api/chats/:chatId/messages (send message)
- POST /api/chats/:chatId/report (report chat)

### 5.5 Notifications\n- GET /api/notifications (list user notifications)
- POST /api/notifications/read (mark notifications as read)

### 5.6 Admin
- GET /api/admin/reports (list all reports)
- PATCH /api/admin/reports/:id/resolve (resolve report)
- DELETE /api/admin/posts/:id (delete any post)
- PATCH /api/admin/users/:id/ban (ban or unban user)
- GET /api/admin/faculties (list faculties)
- POST /api/admin/faculties (add faculty)
- DELETE /api/admin/faculties/:id (remove faculty)

**Validation & Error Handling:**
- All endpoints use input validation (Zod or Joi)
- Consistent error response format
- Proper HTTP status codes
\n---

## 6. Data Models (Mongoose Schemas)

### 6.1 User\n- email (String, unique, required)
- passwordHash (String, required)
- username (String, unique, required)\n- role (String: 'user' | 'admin', default: 'user')
- banned (Boolean, default: false)
- createdAt (Date)
- emailVerified (Boolean, default: false)
\n### 6.2 Profile
- userId (ObjectId ref User, unique)
- displayName (String)\n- faculty (String)
- major (String)
- level (String: L1/L2/L3/M1/M2)
- skills (Array of Strings)
- courses (Array of Strings)
- availability (String)\n- languages (Array of Strings:'Arabic', 'French')
- bio (String)
- avatarUrl (String)
- avatarFileId (String, ImageKit file ID)
\n### 6.3 Post
- authorId (ObjectId ref User)
- title (String, required)
- description (String, required)
- category (String: 'study_partner' | 'project_team' | 'tutor_offer')
- tags (Array of Strings)
- faculty (String)
- level (String)\n- languagePref (String: 'Arabic' | 'French')
- location (String: 'campus' | 'online')
- status (String: 'active' | 'hidden', default: 'active')
- createdAt (Date)
- updatedAt (Date)
- **Indexes:** text index on title, description, tags

### 6.4 Chat
- participants (Array of ObjectId ref User, length: 2)
- lastMessageAt (Date)
- relatedPostId (ObjectId ref Post, optional)
- createdAt (Date)
\n### 6.5 Message
- chatId (ObjectId ref Chat)
- senderId (ObjectId ref User)
- body (String, required)
- type (String: 'text', default: 'text')
- createdAt (Date)
\n### 6.6 Report
- reporterId (ObjectId ref User)
- targetType (String: 'user' | 'post' | 'chat' | 'message')
- targetId (ObjectId)\n- reason (String)
- details (String)
- status (String: 'pending' | 'resolved', default: 'pending')
- createdAt (Date)

### 6.7 Notification
- userId (ObjectId ref User)
- type (String: 'new_message' | 'chat_initiated')
- payload (Mixed, e.g., {chatId, senderId})
- read (Boolean, default: false)
- createdAt (Date)

### 6.8 Faculty
- nameAr (String, required)
- nameFr (String, required)
- active (Boolean, default: true)
\n---

## 7. ImageKit Integration

### 7.1 Avatar Upload Flow
- Backend generates authentication parameters for client-side upload OR handles server-side signed upload\n- Client uses ImageKit SDK or direct API call
- Store avatarUrl and avatarFileId in Profile model
- Provide reusable React component: AvatarUploader
\n### 7.2 Configuration
- Server env: IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT
- Client env: VITE_IMAGEKIT_PUBLIC_KEY, VITE_IMAGEKIT_URL_ENDPOINT

---

## 8. Upstash Redis Usage

### 8.1 Rate Limiting
- Middleware using Upstash Redis REST API
- Rate limits applied to:
  - Login attempts (e.g., 5 per 15 minutes per IP)
  - Registration (e.g., 3 per hour per IP)
  - Post creation (e.g., 10 per hour per user)
  - Chat message sending (e.g., 60 per minute per user)

### 8.2 Caching Strategy
- **Posts list queries:** Cache key by filters + page, TTL 30-60 seconds
- **User profile public view:** Cache by username, TTL 60 seconds
- **Unread notification count:** Cache by userId, TTL 30 seconds
\n### 8.3 Cache Invalidation
- Invalidate post cache on create/update/delete post
- Invalidate profile cache on profile update
- Invalidate notification count on new notification or mark as read

---\n
## 9. Security Requirements

### 9.1 HTTP Security
- Helmet middleware for security headers
- CORS configured for frontend domain only
- CSRF protection: sameSite strict cookies + double submit pattern (if applicable)
\n### 9.2 Authentication Security
- Refresh token stored in httpOnly cookie
- Access token in memory or short-lived cookie
- Password hashing with bcrypt (salt rounds: 10+)
- Token rotation on refresh

### 9.3 Input Validation & Sanitization
- All endpoints validate input using Zod or Joi
- Sanitize HTML or store plain text only for posts/messages to prevent XSS
- Auto-mask phone numbers and emails in post content

### 9.4 Rate Limiting
- Implemented via Upstash Redis as described in section 8.1
\n### 9.5 Content Moderation
- Profanity filter with configurable blacklist for Arabic and French
- Report system for user-generated content
\n---

## 10. User Interface Requirements

### 10.1 Design Principles
- Clean, fast, mobile-first responsive design
- Bilingual support: Arabic (RTL) and French (LTR)\n- Layout automatically flips for RTL in Arabic mode
- Consistent spacing and typography

### 10.2 Navigation Bar
- Multaqa logo (clickable, links to home)\n- Search bar (global post search)
- Language switcher (AR/FR toggle)
- Authentication state:\n  - Logged out: Login/Register buttons
  - Logged in: Profile menu with dropdown (Profile, Messages, Notifications, Logout)

### 10.3 Pages
\n#### Home Page
- Hero section with headline:\n  - AR: 'خلّك تلقى شريك مراجعة أو فريق مشروع تخرج بسهولة'
  - FR: 'Trouvez facilement un partenaire d'étude ou une équipe de projet'
- Category cards (Study Partner, Project Team, Tutor Offer)
- Search bar with filters
\n#### Feed / Posts Listing
- Filter sidebar: category, faculty, level, tags, language, sort by newest
- Post cards with title, description preview, tags, author info
- Pagination controls

#### Post Details\n- Full post content\n- Author profile preview (avatar, name, faculty, level)
- CTA button: 'Message the author'
- Tags and metadata

#### Create/Edit Post
- Form with all post fields
- Tag input component
- Category selector
- Submit/Update button

#### Profile Page
- View mode: display all profile information, avatar, posts by user
- Edit mode: editable form with avatar upload component
\n#### Messages (Inbox)
- List of conversations with last message preview and timestamp
- Unread indicator
- Click to open chat view

#### Chat View
- Message history (scrollable, paginated)
- Message input box
- Send button
- Block/Report options

#### Notifications\n- List of notifications with type, message, and timestamp
- Mark as read button
- Unread badge in navbar

#### Admin Dashboard (Protected Route)
- Reports table (filterable by type and status)
- Actions: view details, resolve, delete content, ban user
- Faculty management section

#### Authentication Pages
- Login form
- Registration form
- Forgot password form
- Reset password form (with token from email)

### 10.4 Internationalization (i18n)
- Translation files:\n  - locales/ar/common.json
  - locales/fr/common.json
- All UI text uses i18n keys
- Language preference stored in localStorage or user profile

---

## 11. Design Style\n
- **Color Scheme:** Primary color: deep blue (#1E40AF) for trust and academia; secondary color: warm orange (#F59E0B) for energy and collaboration; neutral grays for backgrounds and text
- **Typography:** Clean sans-serif font (e.g., Inter or Tajawal for Arabic support), clear hierarchy with bold headings
- **Layout:** Card-based design for posts and profiles, grid layout for post listings, single-column for chat and forms
- **Visual Details:** Rounded corners (border-radius: 8px), subtle shadows for depth, consistent spacing (Tailwind spacing scale), icon style: outline icons for actions
- **Responsive Behavior:** Mobile-first with collapsible sidebar filters, bottom navigation for mobile, stacked layout on small screens

---

## 12. Development Setup

### 12.1 Project Structure
```
/multaqa\n  /client (React + Vite)
  /server (Node.js + Express)
  docker-compose.yml
  README.md
```

### 12.2 Environment Variables
\n**Server (.env.example):**
```
MONGODB_URI=mongodb://localhost:27017/multaqa
JWT_ACCESS_SECRET=your_access_secret\nJWT_REFRESH_SECRET=your_refresh_secret
COOKIE_DOMAIN=localhost
CORS_ORIGIN=http://localhost:5173
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token
IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id
ADMIN_SEED_EMAIL=admin@multaqa.mr
ADMIN_SEED_PASSWORD=securepassword
```

**Client (.env.example):**
```
VITE_API_URL=http://localhost:5000
VITE_IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key\nVITE_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id
```

### 12.3 Scripts
- `npm run dev` in root: runs both client and server concurrently
- `npm run seed` in server: creates admin user from env variables if not exists
- `docker-compose up`: starts application with Docker\n
### 12.4 Docker Compose
- Services: client, server, (optional: MongoDB if not external)
- Volumes for persistent data\n- Network configuration for inter-service communication

---

## 13. Acceptance Criteria

1. Application runs locally end-to-end without errors
2. User can register, verify email (or skip), and log in
3. User can create and edit profile with avatar upload
4. User can create, edit, and delete posts in all three categories
5. User can search and filter posts with full-text search working
6. User can initiate chat from post or profile and send messages
7. User can view notifications for new messages and chat initiations
8. User can report posts, users, and chats
9. Admin can access dashboard, view reports, delete posts, and ban users
10. Admin can manage faculty list (add/edit/delete)
11. Arabic UI displays in RTL layout correctly
12. French UI displays in LTR layout correctly
13. Language switcher toggles between Arabic and French seamlessly
14. Rate limiting prevents spam on login, registration, post creation, and messaging
15. Profanity filter blocks blacklisted words in posts and messages
16. Phone numbers and emails in posts are auto-masked
17. Docker Compose setup works and application runs in containers
18. All API endpoints return proper validation errors and status codes
19. Caching with Redis improves performance for posts and profiles
20. ImageKit integration successfully uploads and displays avatars
\n---

## 14. Branding & Copy

### 14.1 Application Name
- Arabic: ملتقى\n- French: Multaqa

### 14.2 Tagline
- Arabic: خلّك تلقى شريك مراجعة أو فريق مشروع تخرج بسهولة
- French: Trouvez facilement un partenaire d'étude ou une équipe de projet

### 14.3 UI Text
- All buttons, labels, messages, and notifications must have translations in both Arabic and French
- Maintain consistent tone: friendly, supportive, academic
\n---

## 15. Additional Notes

- Ensure all dependencies are listed in package.json for both client and server
- Provide clear setup instructions in README.md
- Include seed data script for faculties and admin user
- Document API endpoints with example requests/responses
- Add comments in code for complex logic
- Follow consistent code style (ESLint + Prettier recommended)
- Write unit tests for critical backend functions (optional but recommended)
- Implement logging for errors and important events (e.g., Winston or Pino)
\n---

This requirements document provides a complete specification for building the Multaqa platform. All features, technical requirements, and acceptance criteria are defined to ensure successful implementation.