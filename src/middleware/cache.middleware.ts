import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../config/redis';

export const cacheResponse = (duration: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.method !== 'GET') {
      next();
      return;
    }
    const key = `response:${req.originalUrl || req.url}`;
    try {
      const cachedData = await cacheService.get(key);

      if (cachedData) {
        res.setHeader('X-Cache', 'HIT');
        res.json(cachedData);
        return;
      }

      const originalJson = res.json;
      res.json = function (body: any): any {
        cacheService.set(key, body, duration).catch(console.error);
        res.setHeader('X-Cache', 'MISS');
        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      next();
    }
  };
};

export const invalidateCache = async (pattern: string): Promise<void> => {
  await cacheService.delPattern(pattern);
};
