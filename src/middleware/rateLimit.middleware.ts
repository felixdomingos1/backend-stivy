import { Request, Response, NextFunction } from 'express';
import { rateLimiter } from '../config/redis';

interface RateLimitConfig {
  windowSeconds: number;
  maxRequests: number;
  message?: string;
}

const defaultConfig: RateLimitConfig = {
  windowSeconds: 60,
  maxRequests: 100,
  message: 'Muitas requisições. Tente novamente mais tarde.'
};

export const rateLimit = (config: Partial<RateLimitConfig> = {}) => {
  const { windowSeconds, maxRequests, message } = { ...defaultConfig, ...config };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = `ip:${req.ip}`;
    const userId = (req as any).usuarioId;
    const finalKey = userId ? `user:${userId}` : key;

    const result = await rateLimiter.checkLimit(finalKey, maxRequests, windowSeconds);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetAt);

    if (!result.allowed) {
      res.status(429).json({
        success: false,
        error: message,
        retryAfter: result.resetAt - Math.floor(Date.now() / 1000)
      });
      return;
    }

    next();
  };
};

export const strictRateLimit = rateLimit({ windowSeconds: 60, maxRequests: 10 });
export const authRateLimit = rateLimit({ windowSeconds: 300, maxRequests: 5 });
export const searchRateLimit = rateLimit({ windowSeconds: 60, maxRequests: 30 });
export const apiRateLimit = rateLimit({ windowSeconds: 60, maxRequests: 200 });
