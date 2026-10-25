import { createClient } from 'redis';
import logger from '../utils/logger';

let redisClient: ReturnType<typeof createClient> | null = null;
let isConnected = false;
let connectionPromise: Promise<void> | null = null;

const CONNECT_TIMEOUT_MS = parseInt(process.env.REDIS_CONNECT_TIMEOUT_MS || '5000', 10);

/**
 * Liga ao Redis. NUNCA lança: se o Redis estiver em baixo devolve false e o servidor
 * continua (cache desactivada, rate limit em memória). O cliente continua a tentar
 * reconectar em background (backoff até 30s) e passa a ser usado quando ficar pronto.
 */
export const connectRedis = async (): Promise<boolean> => {
  if (isConnected && redisClient?.isReady) {
    return true;
  }

  if (connectionPromise) {
    await connectionPromise;
    return isRedisReady();
  }

  if (!redisClient) {
    logger.info(`[REDIS] A ligar a ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`);

    let ultimoErro = '';
    redisClient = createClient({
      ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
      database: parseInt(process.env.REDIS_DB || '0', 10),
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        reconnectStrategy: (retries) => {
          if (retries === 1 || retries % 20 === 0) {
            logger.warn(`[REDIS] Tentativa de reconexão: ${retries}`);
          }
          return Math.min(retries * 200, 30000);
        },
        connectTimeout: 10000
      }
    });

    redisClient.on('ready', () => {
      logger.info('[REDIS] Redis pronto para uso');
      isConnected = true;
      ultimoErro = '';
    });

    redisClient.on('error', (err) => {
      // Evitar inundar os logs com o mesmo erro a cada tentativa de reconexão
      if (err.message !== ultimoErro) {
        logger.error(`[REDIS] Erro: ${err.message}`);
        ultimoErro = err.message;
      }
      isConnected = false;
    });

    redisClient.on('end', () => {
      logger.info('[REDIS] Conexão encerrada');
      isConnected = false;
    });
  }

  const client = redisClient;
  connectionPromise = (async () => {
    try {
      const connectPromise = client.isOpen ? Promise.resolve() : client.connect().then(() => undefined);
      // Se a ligação demorar, não bloquear o arranque; continua em background.
      connectPromise.catch((error: any) => logger.error(`[REDIS] Falha na conexão: ${error?.message}`));

      let timer: NodeJS.Timeout | undefined;
      const timeout = new Promise<'timeout'>((resolve) => {
        timer = setTimeout(() => resolve('timeout'), CONNECT_TIMEOUT_MS);
      });
      const resultado = await Promise.race([connectPromise.then(() => 'ok' as const), timeout]);
      if (timer) clearTimeout(timer);

      if (resultado === 'timeout') {
        logger.warn('[REDIS] Sem ligação dentro do tempo limite; a continuar sem Redis (reconexão em background).');
        isConnected = false;
        return;
      }

      isConnected = client.isReady;
    } catch (error: any) {
      logger.error(`[REDIS] Falha na conexão: ${error?.message}`);
      isConnected = false;
    } finally {
      connectionPromise = null;
    }
  })();

  await connectionPromise;
  return isRedisReady();
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
    try {
      if (redisClient.isOpen) await redisClient.quit();
    } catch (error: any) {
      logger.warn(`[REDIS] Erro ao desligar: ${error?.message}`);
    }
    redisClient = null;
    isConnected = false;
    logger.info('[REDIS] 👋 Desconectado');
  }
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  current: number;
};

/**
 * Limitador em memória (janela deslizante) usado quando o Redis não está disponível.
 * Não é partilhado entre instâncias, mas evita "permitir tudo" quando o Redis cai.
 */
export class InMemoryRateLimiter {
  private hits = new Map<string, number[]>();
  private ultimaLimpeza = Date.now();
  private static readonly MAX_CHAVES = 50000;

  checkLimit(key: string, maxRequests: number, windowSeconds: number): RateLimitResult {
    const agoraMs = Date.now();
    const inicioJanela = agoraMs - windowSeconds * 1000;
    this.limparSeNecessario(agoraMs);

    const lista = (this.hits.get(key) || []).filter(t => t > inicioJanela);
    const current = lista.length;
    const allowed = current < maxRequests;

    if (allowed) {
      lista.push(agoraMs);
    }
    if (lista.length > 0) {
      this.hits.set(key, lista);
    } else {
      this.hits.delete(key);
    }

    const resetAt = Math.floor(((lista[0] ?? agoraMs) + windowSeconds * 1000) / 1000);
    return {
      allowed,
      remaining: Math.max(0, maxRequests - lista.length),
      resetAt,
      current,
    };
  }

  reset(key: string): void {
    this.hits.delete(key);
  }

  count(key: string): number {
    return this.hits.get(key)?.length ?? 0;
  }

  private limparSeNecessario(agoraMs: number): void {
    // Limpeza periódica (1 min) ou quando o mapa cresce demais — evita fuga de memória
    if (agoraMs - this.ultimaLimpeza < 60000 && this.hits.size < InMemoryRateLimiter.MAX_CHAVES) return;
    this.ultimaLimpeza = agoraMs;
    // Janela máxima assumida para limpeza: 1h
    const limite = agoraMs - 3600 * 1000;
    for (const [k, v] of this.hits) {
      if (!v.length || v[v.length - 1] < limite) this.hits.delete(k);
    }
    if (this.hits.size >= InMemoryRateLimiter.MAX_CHAVES) {
      this.hits.clear();
    }
  }
}

export class RateLimiter {
  private readonly prefix = 'rate_limit:';
  private readonly memoria = new InMemoryRateLimiter();

  async checkLimit(key: string, maxRequests: number, windowSeconds: number): Promise<RateLimitResult> {
    if (!isRedisReady()) {
      return this.memoria.checkLimit(key, maxRequests, windowSeconds);
    }

    try {
      const client = getRedisClient();
      const fullKey = `${this.prefix}${key}`;
      const nowMs = Date.now();
      const now = Math.floor(nowMs / 1000);
      const windowStartMs = nowMs - windowSeconds * 1000;
      await client.zRemRangeByScore(fullKey, 0, windowStartMs);
      const current = await client.zCard(fullKey);
      const allowed = current < maxRequests;

      if (allowed) {
        const member = `${nowMs}:${Math.random().toString(36).substring(2, 10)}`;
        await client.zAdd(fullKey, { score: nowMs, value: member });
        await client.expire(fullKey, windowSeconds);
      }

      const oldest = await client.zRangeWithScores(fullKey, 0, 0);
      const resetAt = oldest.length > 0
        ? Math.floor(oldest[0].score / 1000) + windowSeconds
        : now + windowSeconds;
      const remaining = Math.max(0, maxRequests - current - (allowed ? 1 : 0));

      logger.debug(`[RATE-LIMIT] ${key}: ${current}/${maxRequests}`);

      return { allowed, remaining, resetAt, current };
    } catch (error) {
      logger.error(`[RATE-LIMIT] Erro no Redis para ${key}; a usar limitador em memória`, error);
      return this.memoria.checkLimit(key, maxRequests, windowSeconds);
    }
  }

  async resetLimit(key: string): Promise<void> {
    this.memoria.reset(key);
    if (!isRedisReady()) return;

    try {
      const client = getRedisClient();
      await client.del(`${this.prefix}${key}`);
      logger.debug(`[RATE-LIMIT] Resetado para ${key}`);
    } catch (error) {
      logger.error(`[RATE-LIMIT] Erro ao resetar ${key}:`, error);
    }
  }

  async getCurrentCount(key: string): Promise<number> {
    if (!isRedisReady()) return this.memoria.count(key);

    try {
      const client = getRedisClient();
      return await client.zCard(`${this.prefix}${key}`);
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
      logger.debug(`[CACHE] SET ${key} (TTL: ${ttl}s)`);
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
        logger.debug(`[CACHE] MISS ${key}`);
        return null;
      }
      logger.debug(`[CACHE] HIT ${key}`);
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
      logger.debug(`[CACHE] DEL ${key}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Itera chaves com SCAN (não bloqueante, ao contrário de KEYS).
   */
  async scanKeys(pattern: string, count: number = 200): Promise<string[]> {
    if (!isRedisReady()) return [];
    const client = getRedisClient();
    const keys: string[] = [];
    for await (const lote of client.scanIterator({ MATCH: pattern, COUNT: count }) as AsyncIterable<string | string[]>) {
      if (Array.isArray(lote)) keys.push(...lote);
      else keys.push(lote);
    }
    return keys;
  }

  /** Apaga todas as chaves que correspondem ao padrão glob do Redis (usa SCAN + DEL em lotes). */
  async delPattern(pattern: string): Promise<number> {
    if (!isRedisReady()) return 0;

    try {
      const client = getRedisClient();
      const keys = await this.scanKeys(pattern);
      for (let i = 0; i < keys.length; i += 500) {
        await client.del(keys.slice(i, i + 500));
      }
      if (keys.length > 0) {
        logger.debug(`[CACHE] DEL pattern ${pattern} (${keys.length} keys)`);
      }
      return keys.length;
    } catch (error) {
      logger.error(`[CACHE] Erro ao deletar pattern ${pattern}:`, error);
      return 0;
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
