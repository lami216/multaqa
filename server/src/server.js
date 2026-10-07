import './config/env.js';
import User from './models/User.js';
import AuthFlow from './models/AuthFlow.js';
import {validateSocialEnvironment} from './config/socialEnv.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import connectDB from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import postRoutes from './routes/postRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import telegramRoutes from './routes/telegramRoutes.js';
import { authenticate, requireVerifiedIdentity } from './middleware/auth.js';
import lookupRoutes from './routes/lookupRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import unionReviewRoutes from './routes/unionReviewRoutes.js';
import { startLifecycleJob } from './jobs/lifecycleJob.js';

// مهم: لا تستخدم static import هنا لأن ESM ينفّذ imports قبل dotenv.config
const { default: imagekit } = await import('./config/imagekit.js');

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
validateSocialEnvironment();

app.set('etag', false);

if (isProduction) {
  app.set('trust proxy', 1);
}

await connectDB();
await User.createIndexes();
await AuthFlow.createIndexes();
const oldEmailIndex = (await User.collection.indexes()).find(index => index.name === 'email_1' && index.unique && index.key.email === 1 && Object.keys(index.key).length === 1 && !index.partialFilterExpression);
if (oldEmailIndex) await User.collection.dropIndex(oldEmailIndex.name);
const { default: Profile } = await import('./models/Profile.js');
await Promise.all([User.createIndexes(), Profile.createIndexes()]);
await User.updateMany({ telegramLinked: true, telegramNotificationsEnabled: { $exists: false } }, { $set: { telegramNotificationsEnabled: true } });
await User.updateMany({telegramUserId:{$type:'string'},telegramOwnerId:{$exists:false}},[{$set:{telegramOwnerId:'$telegramUserId'}}]);
await User.updateMany({telegramLinked:true,telegramChatId:{$type:'string'},telegramOwnerId:{$exists:false}},[{$set:{telegramOwnerId:'$telegramChatId'}}]);
startLifecycleJob();

app.use(helmet());
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
  }
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/imagekit-auth', authenticate, requireVerifiedIdentity, (req, res) => {
  try {
    const authenticationParameters = imagekit.getAuthenticationParameters();
    res.json({
      ...authenticationParameters,
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
    });
  } catch (error) {
    console.error('ImageKit auth error:', error);
    res.status(500).json({ error: 'Failed to generate ImageKit auth parameters' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api', lookupRoutes);
app.use('/api', unionReviewRoutes);

if (isProduction) {
  const frontendDist = path.resolve(__dirname, '../../dist');

  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }

    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: isProduction ? 'Internal server error' : err.message || 'Internal server error'
  });
});

app.listen(PORT, process.env.HOST || '127.0.0.1', () => {
  console.log(`Server running on port ${PORT}`);
});
