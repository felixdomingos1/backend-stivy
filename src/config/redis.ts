import { createClient } from 'redis';
import logger from '../utils/logger';

let redisClient: ReturnType<typeof createClient> | null = null;
let isConnected = false;
let connectionPromise: Promise<void> | null = null;

export const connectRedis = async (): Promise<boolean> => {
  if (isConnected && redisClient?.isReady) {
    logger.info('[REDIS] ✅ Já conectado');
    return true;
  }

  if (connectionPromise) {
    logger.info('[REDIS] ⏳ Aguardando conexão existente...');
    await connectionPromise;
    return isConnected;
  }

  logger.info('[REDIS] 🔄 Iniciando nova conexão...');
  logger.info(`[REDIS] 📡 Host: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`);

  redisClient = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      reconnectStrategy: (retries) => {
        logger.warn(`[REDIS] 🔄 Tentativa de reconexão: ${retries}`);
        if (retries > 10) {
          return new Error('Max reconnection attempts reached');
        }
        return Math.min(retries * 100, 3000);
      },
      connectTimeout: 10000
    }
  });

  redisClient.on('connect', () => {
    logger.info('[REDIS] 📡 Cliente conectado ao servidor');
  });

  redisClient.on('ready', () => {
    logger.info('[REDIS] ✅ Redis pronto para uso!');
    isConnected = true;
  });

  redisClient.on('error', (err) => {
    logger.error(`[REDIS] ❌ Erro: ${err.message}`);
    isConnected = false;
  });

  redisClient.on('end', () => {
    logger.info('[REDIS] 🔌 Conexão encerrada');
    isConnected = false;
  });

  connectionPromise = (async () => {
    try {
      await redisClient!.connect();

      await redisClient!.set('test:connection', 'ok');
      const test = await redisClient!.get('test:connection');

      if (test === 'ok') {
        logger.info('[REDIS] ✅ Teste de conexão bem sucedido!');
        isConnected = true;
      } else {
        throw new Error('Teste de conexão falhou');
      }
    } catch (error: any) {
      logger.error(`[REDIS] ❌ Falha na conexão: ${error.message}`);
      isConnected = false;
      throw error;
    } finally {
      connectionPromise = null;
    }
  })();

  await connectionPromise;
  return isConnected;
};

export const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis first.');
  }
  return redisClient;
};

export const isRedisReady = (): boolean => {
  return isConnected && redisClient !== null && redisClient.isReady;
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isConnected = false;
    logger.info('[REDIS] 👋 Desconectado');
  }
};

export class RateLimiter {
  private readonly prefix = 'rate_limit:';

  async checkLimit(key: string, maxRequests: number, windowSeconds: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
    current: number;
  }> {
    if (!isRedisReady()) {
      logger.warn(`[RATE-LIMIT] Redis não pronto, permitindo requisição para ${key}`);
      return {
        allowed: true,
        remaining: maxRequests,
        resetAt: Math.floor(Date.now() / 1000) + windowSeconds,
        current: 0
      };
    }

    try {
      const client = getRedisClient();
      const fullKey = `${this.prefix}${key}`;
      const now = Math.floor(Date.now() / 1000);
      const windowStart = now - windowSeconds;
      await client.zRemRangeByScore(fullKey, 0, windowStart);
      const current = await client.zCard(fullKey);
      const remaining = Math.max(0, maxRequests - current);
      const allowed = current < maxRequests;

      if (allowed) {
        const member = `${now}:${Math.random().toString(36).substring(2, 10)}`;
        await client.zAdd(fullKey, { score: now, value: member });
        await client.expire(fullKey, windowSeconds);
      }

      const oldest = await client.zRangeWithScores(fullKey, 0, 0);
      const resetAt = oldest.length > 0
        ? Math.floor(oldest[0].score) + windowSeconds
        : now + windowSeconds;

      logger.info(`[RATE-LIMIT] ${key}: ${current}/${maxRequests} (remaining: ${remaining})`);

      return { allowed, remaining, resetAt, current };
    } catch (error) {
      logger.error(`[RATE-LIMIT] Erro ao verificar limite para ${key}:`, error);
      return {
        allowed: true,
        remaining: maxRequests,
        resetAt: Math.floor(Date.now() / 1000) + windowSeconds,
        current: 0
      };
    }
  }

  async resetLimit(key: string): Promise<void> {
    if (!isRedisReady()) return;

    try {
      const client = getRedisClient();
      const fullKey = `${this.prefix}${key}`;
      await client.del(fullKey);
      logger.info(`[RATE-LIMIT] Resetado para ${key}`);
    } catch (error) {
      logger.error(`[RATE-LIMIT] Erro ao resetar ${key}:`, error);
    }
  }

  async getCurrentCount(key: string): Promise<number> {
    if (!isRedisReady()) return 0;

    try {
      const client = getRedisClient();
      const fullKey = `${this.prefix}${key}`;
      return await client.zCard(fullKey);
    } catch (error) {
      return 0;
    }
  }
}

export class CacheService {
  async set(key: string, value: any, ttl: number = 3600): Promise<boolean> {
    if (!isRedisReady()) return false;

    try {
      const client = getRedisClient();
      await client.setEx(key, ttl, JSON.stringify(value));
      logger.info(`[CACHE] SET ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      logger.error(`[CACHE] Erro ao setar ${key}:`, error);
      return false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!isRedisReady()) return null;

    try {
      const client = getRedisClient();
      const data = await client.get(key);
      if (!data) {
        logger.info(`[CACHE] MISS ${key}`);
        return null;
      }
      logger.info(`[CACHE] HIT ${key}`);
      return JSON.parse(data) as T;
    } catch (error) {
      logger.error(`[CACHE] Erro ao obter ${key}:`, error);
      return null;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!isRedisReady()) return false;

    try {
      const client = getRedisClient();
      await client.del(key);
      logger.info(`[CACHE] DEL ${key}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  async delPattern(pattern: string): Promise<void> {
    if (!isRedisReady()) return;

    try {
      const client = getRedisClient();
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
        logger.info(`[CACHE] DEL pattern ${pattern} (${keys.length} keys)`);
      }
    } catch (error) {
      logger.error(`[CACHE] Erro ao deletar pattern ${pattern}:`, error);
    }
  }

  async flushAll(): Promise<void> {
    if (!isRedisReady()) return;

    try {
      const client = getRedisClient();
      await client.flushAll();
      logger.info('[CACHE] FLUSHALL executado');
    } catch (error) {
      logger.error('[CACHE] Erro ao executar flushall:', error);
    }
  }
}

export const rateLimiter = new RateLimiter();
export const cacheService = new CacheService();

export default {
  connectRedis,
  getRedisClient,
  isRedisReady,
  disconnectRedis,
  rateLimiter,
  cacheService
};
