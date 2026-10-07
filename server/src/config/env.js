import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

if (process.env.NODE_ENV === 'production') {
  const required = ['MONGODB_URI', 'CORS_ORIGIN', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET',
    'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'IMAGEKIT_PUBLIC_KEY',
    'IMAGEKIT_PRIVATE_KEY', 'IMAGEKIT_URL_ENDPOINT'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length) throw new Error(`Missing production configuration: ${missing.join(', ')}`);
  for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    if (process.env[key].length < 32) throw new Error(`${key} must contain at least 32 characters`);
  }
  if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
    throw new Error('Access and refresh secrets must be distinct');
  }
  if (!process.env.CORS_ORIGIN.startsWith('https://')) throw new Error('Production CORS_ORIGIN must use HTTPS');
  if (process.env.TELEGRAM_BOT_TOKEN && !process.env.TELEGRAM_WEBHOOK_SECRET) {
    throw new Error('TELEGRAM_WEBHOOK_SECRET is required when the bot is enabled');
  }
}
