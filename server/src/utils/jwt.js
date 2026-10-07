import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

const sign = (userId, tokenVersion, purpose, secret, expiresIn, authTime = Math.floor(Date.now()/1000)) => jwt.sign(
  { userId, tokenVersion, purpose, authTime }, secret,
  { algorithm: 'HS256', expiresIn, jwtid: crypto.randomUUID() }
);
const verify = (token, secret, purpose) => {
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    return decoded.purpose === purpose && typeof decoded.userId === 'string' ? decoded : null;
  } catch {
    return null;
  }
};
export const generateAccessToken = (userId, tokenVersion = 0, authTime) => sign(
  userId.toString(), tokenVersion, 'access', process.env.JWT_ACCESS_SECRET, process.env.JWT_ACCESS_EXPIRY || '15m', authTime
);
export const generateRefreshToken = (userId, tokenVersion = 0, authTime) => sign(
  userId.toString(), tokenVersion, 'refresh', process.env.JWT_REFRESH_SECRET, process.env.JWT_REFRESH_EXPIRY || '7d', authTime
);
export const verifyAccessToken = token => verify(token, process.env.JWT_ACCESS_SECRET, 'access');
export const verifyRefreshToken = token => verify(token, process.env.JWT_REFRESH_SECRET, 'refresh');
export const generateTelegramLinkToken = userId => sign(
  userId.toString(), 0, 'telegram_link', process.env.JWT_TELEGRAM_SECRET || process.env.JWT_ACCESS_SECRET, '10m'
);
export const verifyTelegramLinkToken = token => verify(
  token, process.env.JWT_TELEGRAM_SECRET || process.env.JWT_ACCESS_SECRET, 'telegram_link'
);
