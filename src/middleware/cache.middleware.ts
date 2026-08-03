import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../config/redis';
import logger from '../utils/logger';

export interface CacheOptions {
  duration?: number;
  keyPrefix?: string;
  excludeParams?: string[];
}

export const cacheResponse = (options: CacheOptions = {}) => {
  const duration = options.duration || 300;
  const keyPrefix = options.keyPrefix || 'response';
  const excludeParams = options.excludeParams || [];

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.method !== 'GET') {
      next();
      return;
    }

    let key = `${keyPrefix}:${req.originalUrl || req.url}`;

    if (excludeParams.length > 0 && req.query) {
      const filteredQuery = { ...req.query };
      excludeParams.forEach(param => delete filteredQuery[param]);
      key = `${keyPrefix}:${req.path}:${JSON.stringify(filteredQuery)}`;
    }

    try {
      const cachedData = await cacheService.get(key);

      if (cachedData) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Timestamp', new Date().toISOString());
        res.json(cachedData);
        return;
      }

      const originalJson = res.json.bind(res);
      (res as any).json = function (body: any): any {
        if (body && (body.success !== false)) {
          cacheService.set(key, body, duration).catch(err => logger.error('Cache set error:', err));
        }
        res.setHeader('X-Cache', 'MISS');
        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error('Cache error:', error);
      next();
    }
  };
};

export const cacheListResponse = (duration: number = 60) => {
  return cacheResponse({ duration, keyPrefix: 'list' });
};

export const cacheDetailResponse = (duration: number = 300) => {
  return cacheResponse({ duration, keyPrefix: 'detail' });
};

export const invalidateCache = async (pattern: string): Promise<void> => {
  await cacheService.delPattern(pattern);
};

export const invalidateOnWrite = (patterns: string[]) => {
  return async (_: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

      (res as any).json = async function (body: any): Promise<any> {
        if (body && body.success !== false) {
          for (const pattern of patterns) {
            await invalidateCache(pattern).catch(err => logger.error('Cache invalidate error:', err));
          }
        }
        return originalJson(body);
      };

    next();
  };
};

export const cacheStatsResponse = (duration: number = 60) => {
  return cacheResponse({ duration, keyPrefix: 'stats' });
};
