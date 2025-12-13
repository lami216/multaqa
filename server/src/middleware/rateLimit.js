import redis from '../config/redis.js';

const rateLimit = (options) => {
  const { windowMs, max, keyGenerator } = options;

  return async (req, res, next) => {
    try {
      const key = keyGenerator ? keyGenerator(req) : `ratelimit:${req.ip}`;
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, Math.ceil(windowMs / 1000));
      }

      if (current > max) {
        return res.status(429).json({ 
          error: 'Too many requests, please try again later' 
        });
      }

      next();
    } catch (error) {
      console.error('Rate limit error:', error);
      next();
    }
  };
};

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => `ratelimit:login:${req.ip}`
});

export const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => `ratelimit:register:${req.ip}`
});

export const postCreationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `ratelimit:post:${req.user?._id || req.ip}`
});

export const messageRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => `ratelimit:message:${req.user?._id || req.ip}`
});

export default rateLimit;
