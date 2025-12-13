# Multaqa API Reference

Base URL: `http://localhost:5000/api`

## Authentication

All authenticated endpoints require the `Authorization` header:
```
Authorization: Bearer <access_token>
```

## Response Format

### Success Response
```json
{
  "message": "Success message",
  "data": { ... }
}
```

### Error Response
```json
{
  "error": "Error message"
}
```

---

## Authentication Endpoints

### Register
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "username": "username"
}
```

**Response**: `{ message, accessToken, user }`

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**: `{ message, accessToken, user }`
**Sets Cookie**: `refreshToken` (httpOnly)

### Refresh Token
```http
POST /auth/refresh
Cookie: refreshToken=<token>
```

**Response**: `{ accessToken }`

### Logout
```http
POST /auth/logout
Authorization: Bearer <token>
```

**Response**: `{ message }`

### Forgot Password
```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response**: `{ message }`

### Reset Password
```http
POST /auth/reset-password
Content-Type: application/json

{
  "token": "reset_token_from_email",
  "password": "newpassword123"
}
```

**Response**: `{ message }`

### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>
```

**Response**: `{ user, profile }`

---

## User Profile Endpoints

### Get Public Profile
```http
GET /users/:username
```

**Response**: `{ user, profile, posts }`

### Update Profile
```http
PATCH /users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "displayName": "John Doe",
  "faculty": "Faculty of Sciences",
  "major": "Computer Science",
  "level": "L3",
  "skills": ["JavaScript", "Python"],
  "courses": ["Data Structures", "Algorithms"],
  "availability": "Weekdays 2-5 PM",
  "languages": ["Arabic", "French"],
  "bio": "Looking for study partners"
}
```

**Response**: `{ message, profile }`

### Upload Avatar
```http
POST /users/avatar
Authorization: Bearer <token>
Content-Type: application/json

{
  "avatarUrl": "https://ik.imagekit.io/...",
  "avatarFileId": "file_id_from_imagekit"
}
```

**Response**: `{ message, profile }`

---

## Post Endpoints

### List Posts
```http
GET /posts?category=study_partner&faculty=Sciences&level=L3&search=math&page=1&limit=20
```

**Query Parameters**:
- `category`: study_partner | project_team | tutor_offer
- `faculty`: Faculty name
- `level`: L1 | L2 | L3 | M1 | M2
- `languagePref`: Arabic | French
- `location`: campus | online
- `search`: Full-text search
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response**: `{ posts, pagination }`

### Get Post
```http
GET /posts/:id
```

**Response**: `{ post, author }`

### Create Post
```http
POST /posts
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Looking for study partner",
  "description": "Need someone to study calculus with",
  "category": "study_partner",
  "tags": ["math", "calculus"],
  "faculty": "Faculty of Sciences",
  "level": "L2",
  "languagePref": "French",
  "location": "campus"
}
```

**Response**: `{ message, post }`

### Update Post
```http
PATCH /posts/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated title",
  "description": "Updated description"
}
```

**Response**: `{ message, post }`

### Delete Post
```http
DELETE /posts/:id
Authorization: Bearer <token>
```

**Response**: `{ message }`

### Report Post
```http
POST /posts/:id/report
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Spam",
  "details": "This post contains spam content",
  "targetType": "post",
  "targetId": "post_id"
}
```

**Response**: `{ message }`

---

## Chat Endpoints

### List Chats
```http
GET /chats
Authorization: Bearer <token>
```

**Response**: `{ chats }`

### Create or Get Chat
```http
POST /chats
Authorization: Bearer <token>
Content-Type: application/json

{
  "otherUserId": "user_id",
  "postId": "post_id" // optional
}
```

**Response**: `{ chat }`

### Get Messages
```http
GET /chats/:chatId/messages?page=1&limit=50
Authorization: Bearer <token>
```

**Response**: `{ messages, pagination }`

### Send Message
```http
POST /chats/:chatId/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "body": "Hello, I'm interested in studying together"
}
```

**Response**: `{ message }`

### Report Chat
```http
POST /chats/:chatId/report
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Harassment",
  "details": "User is sending inappropriate messages",
  "targetType": "chat",
  "targetId": "chat_id"
}
```

**Response**: `{ message }`

---

## Notification Endpoints

### List Notifications
```http
GET /notifications?page=1&limit=20
Authorization: Bearer <token>
```

**Response**: `{ notifications, pagination, unread }`

### Mark as Read
```http
POST /notifications/read
Authorization: Bearer <token>
Content-Type: application/json

{
  "notificationIds": ["id1", "id2"] // optional, marks all if not provided
}
```

**Response**: `{ message }`

### Get Unread Count
```http
GET /notifications/unread-count
Authorization: Bearer <token>
```

**Response**: `{ unread }`

---

## Admin Endpoints

All admin endpoints require `role: 'admin'`

### List Reports
```http
GET /admin/reports?status=pending&targetType=post&page=1&limit=20
Authorization: Bearer <admin_token>
```

**Response**: `{ reports, pagination }`

### Resolve Report
```http
PATCH /admin/reports/:id/resolve
Authorization: Bearer <admin_token>
```

**Response**: `{ message, report }`

### Delete Post (Admin)
```http
DELETE /admin/posts/:id
Authorization: Bearer <admin_token>
```

**Response**: `{ message }`

### Ban/Unban User
```http
PATCH /admin/users/:id/ban
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "banned": true // or false to unban
}
```

**Response**: `{ message, user }`

### List Faculties
```http
GET /admin/faculties
Authorization: Bearer <admin_token>
```

**Response**: `{ faculties }`

### Create Faculty
```http
POST /admin/faculties
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "nameAr": "كلية العلوم",
  "nameFr": "Faculté des Sciences"
}
```

**Response**: `{ message, faculty }`

### Delete Faculty
```http
DELETE /admin/faculties/:id
Authorization: Bearer <admin_token>
```

**Response**: `{ message }`

---

## Utility Endpoints

### Health Check
```http
GET /health
```

**Response**: `{ status: "ok", message: "Multaqa API is running" }`

### ImageKit Auth
```http
GET /imagekit-auth
```

**Response**: `{ token, expire, signature }`

---

## Rate Limits

- **Login**: 5 attempts per 15 minutes per IP
- **Registration**: 3 attempts per hour per IP
- **Post Creation**: 10 posts per hour per user
- **Message Sending**: 60 messages per minute per user

---

## Error Codes

- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid or missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## Data Models

### User
```typescript
{
  id: string;
  email: string;
  username: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
}
```

### Profile
```typescript
{
  _id: string;
  userId: string;
  displayName?: string;
  faculty?: string;
  major?: string;
  level?: 'L1' | 'L2' | 'L3' | 'M1' | 'M2';
  skills?: string[];
  courses?: string[];
  availability?: string;
  languages?: ('Arabic' | 'French')[];
  bio?: string;
  avatarUrl?: string;
  avatarFileId?: string;
}
```

### Post
```typescript
{
  _id: string;
  authorId: string;
  title: string;
  description: string;
  category: 'study_partner' | 'project_team' | 'tutor_offer';
  tags?: string[];
  faculty?: string;
  level?: 'L1' | 'L2' | 'L3' | 'M1' | 'M2';
  languagePref?: 'Arabic' | 'French';
  location?: 'campus' | 'online';
  status: 'active' | 'hidden';
  createdAt: string;
  updatedAt: string;
}
```

### Chat
```typescript
{
  _id: string;
  participants: string[];
  lastMessageAt: string;
  relatedPostId?: string;
}
```

### Message
```typescript
{
  _id: string;
  chatId: string;
  senderId: string;
  body: string;
  type: 'text';
  read: boolean;
  createdAt: string;
}
```

### Notification
```typescript
{
  _id: string;
  userId: string;
  type: 'new_message' | 'chat_initiated';
  payload: any;
  read: boolean;
  createdAt: string;
}
```

### Report
```typescript
{
  _id: string;
  reporterId: string;
  targetType: 'user' | 'post' | 'chat' | 'message';
  targetId: string;
  reason: string;
  details?: string;
  status: 'pending' | 'resolved';
  createdAt: string;
}
```

### Faculty
```typescript
{
  _id: string;
  nameAr: string;
  nameFr: string;
  active: boolean;
}
```

---

## Testing with cURL

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","username":"testuser"}'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Get Posts
```bash
curl http://localhost:5000/api/posts
```

### Create Post (Authenticated)
```bash
curl -X POST http://localhost:5000/api/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"title":"Study Partner Needed","description":"Looking for someone to study with","category":"study_partner"}'
```

---

**Last Updated**: 2025-12-13
