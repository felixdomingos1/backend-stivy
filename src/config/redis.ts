import { createClient } from 'redis';

let redisClient: ReturnType<typeof createClient> | null = null;
let isConnected = false;
let connectionPromise: Promise<void> | null = null;

export const connectRedis = async (): Promise<boolean> => {
  if (isConnected && redisClient?.isReady) {
    console.log('[REDIS] ✅ Já conectado');
    return true;
  }

  if (connectionPromise) {
    console.log('[REDIS] ⏳ Aguardando conexão existente...');
    await connectionPromise;
    return isConnected;
  }

  console.log('[REDIS] 🔄 Iniciando nova conexão...');
  console.log(`[REDIS] 📡 Host: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`);

  redisClient = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      reconnectStrategy: (retries) => {
        console.log(`[REDIS] 🔄 Tentativa de reconexão: ${retries}`);
        if (retries > 10) {
          return new Error('Max reconnection attempts reached');
        }
        return Math.min(retries * 100, 3000);
      },
      connectTimeout: 10000
    }
  });

  redisClient.on('connect', () => {
    console.log('[REDIS] 📡 Cliente conectado ao servidor');
  });

  redisClient.on('ready', () => {
    console.log('[REDIS] ✅ Redis pronto para uso!');
    isConnected = true;
  });

  redisClient.on('error', (err) => {
    console.error(`[REDIS] ❌ Erro: ${err.message}`);
    isConnected = false;
  });

  redisClient.on('end', () => {
    console.log('[REDIS] 🔌 Conexão encerrada');
    isConnected = false;
  });

  connectionPromise = (async () => {
    try {
      await redisClient!.connect();

      await redisClient!.set('test:connection', 'ok');
      const test = await redisClient!.get('test:connection');

      if (test === 'ok') {
        console.log('[REDIS] ✅ Teste de conexão bem sucedido!');
        isConnected = true;
      } else {
        throw new Error('Teste de conexão falhou');
      }
    } catch (error: any) {
      console.error(`[REDIS] ❌ Falha na conexão: ${error.message}`);
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
    console.log('[REDIS] 👋 Desconectado');
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
      console.warn(`[RATE-LIMIT] Redis não pronto, permitindo requisição para ${key}`);
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

      console.log(`[RATE-LIMIT] ${key}: ${current}/${maxRequests} (remaining: ${remaining})`);

      return { allowed, remaining, resetAt, current };
    } catch (error) {
      console.error(`[RATE-LIMIT] Erro ao verificar limite para ${key}:`, error);
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
      console.log(`[RATE-LIMIT] Resetado para ${key}`);
    } catch (error) {
      console.error(`[RATE-LIMIT] Erro ao resetar ${key}:`, error);
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
      console.log(`[CACHE] SET ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      console.error(`[CACHE] Erro ao setar ${key}:`, error);
      return false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!isRedisReady()) return null;

    try {
      const client = getRedisClient();
      const data = await client.get(key);
      if (!data) {
        console.log(`[CACHE] MISS ${key}`);
        return null;
      }
      console.log(`[CACHE] HIT ${key}`);
      return JSON.parse(data) as T;
    } catch (error) {
      console.error(`[CACHE] Erro ao obter ${key}:`, error);
      return null;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!isRedisReady()) return false;

    try {
      const client = getRedisClient();
      await client.del(key);
      console.log(`[CACHE] DEL ${key}`);
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
        console.log(`[CACHE] DEL pattern ${pattern} (${keys.length} keys)`);
      }
    } catch (error) {
      console.error(`[CACHE] Erro ao deletar pattern ${pattern}:`, error);
    }
  }

  async flushAll(): Promise<void> {
    if (!isRedisReady()) return;

    try {
      const client = getRedisClient();
      await client.flushAll();
      console.log('[CACHE] FLUSHALL executado');
    } catch (error) {
      console.error('[CACHE] Erro ao executar flushall:', error);
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
