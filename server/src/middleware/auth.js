import { verifyAccessToken } from '../utils/jwt.js';
import User from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : req.cookies.accessToken;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = await User.findById(decoded.userId).select('-passwordHash -refreshToken');
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.banned) {
      return res.status(403).json({ error: 'Account has been banned' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

export const requireAdmin = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
