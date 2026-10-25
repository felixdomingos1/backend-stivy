import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../config/redis';
import { verificarToken } from '../utils/jwt';
import logger from '../utils/logger';

/**
 * FORMATO DAS CHAVES DE CACHE
 * ---------------------------
 *   cache:<prefixo>:<url completa com query>|u:<id_usuario | anon>
 *
 *   ex.: cache:list:/api/v1/events?page=1&limit=10|u:550e8400-e29b-41d4-a716-446655440000
 *        cache:detail:/api/v1/events/abc|u:anon
 *
 * O id do utilizador faz parte da chave, por isso respostas personalizadas
 * (eu_participo, sou_organizador, etc.) nunca são servidas a outro utilizador.
 * Só se guardam respostas 2xx com `success !== false`.
 *
 * PADRÕES DE INVALIDAÇÃO (invalidateOnWrite / invalidateCache)
 * ------------------------------------------------------------
 * Usar a URL completa da API (com /api/v1) e glob do Redis (`*`):
 *   invalidateOnWrite(['/api/v1/events*'])            -> todas as listas/detalhes de eventos, todos os utilizadores
 *   invalidateOnWrite(['/api/v1/events/123*'])        -> detalhe do evento 123 e sub-rotas
 *   invalidateOnWrite([(req) => `/api/v1/events/${req.params.id}*`])  -> padrão dinâmico
 * Um padrão que começa por "/" é convertido para `cache:*:<padrão>`; se não terminar em `*`
 * acrescenta-se `|u:*` (todas as variantes de utilizador da URL exacta).
 * Padrões antigos do tipo `list:*\/api/events*` continuam aceites (prefixo + /api -> /api/v1).
 */

export interface CacheOptions {
  duration?: number;
  keyPrefix?: string;
  excludeParams?: string[];
}

export const CACHE_ROOT = 'cache';
const PREFIXOS_CONHECIDOS = ['list', 'detail', 'stats', 'response'];

/** Resolve o id do utilizador do pedido: req.usuarioId (autenticar) ou token Bearer. */
const resolverUsuario = (req: Request): { userId: string | null; tokenInvalido: boolean } => {
  const usuarioId = (req as any).usuarioId as string | undefined;
  if (usuarioId) return { userId: usuarioId, tokenInvalido: false };

  const header = req.headers?.authorization;
  if (!header || !header.startsWith('Bearer ')) return { userId: null, tokenInvalido: false };

  try {
    const decoded = verificarToken(header.slice(7));
    return { userId: decoded?.id ?? null, tokenInvalido: !decoded?.id };
  } catch {
    return { userId: null, tokenInvalido: true };
  }
};

const montarUrl = (req: Request, excludeParams: string[]): string => {
  const original = req.originalUrl || req.url;
  if (excludeParams.length === 0) return original;

  const [caminho, query = ''] = original.split('?');
  const params = new URLSearchParams(query);
  excludeParams.forEach(p => params.delete(p));
  const resto = params.toString();
  return resto ? `${caminho}?${resto}` : caminho;
};

export const buildCacheKey = (prefix: string, url: string, userId?: string | null): string =>
  `${CACHE_ROOT}:${prefix}:${url}|u:${userId || 'anon'}`;

/**
 * Converte um padrão de invalidação para o padrão glob real das chaves (ver comentário no topo).
 */
export const normalizarPadraoCache = (pattern: string): string => {
  let p = pattern.trim();

  if (p.startsWith(`${CACHE_ROOT}:`)) return p;

  const legado = p.match(/^([a-z]+):(.*)$/);
  let prefixo = '*';
  if (legado && PREFIXOS_CONHECIDOS.includes(legado[1])) {
    prefixo = legado[1];
    p = legado[2];
  }

  // Compatibilidade: padrões antigos sem a versão da API
  p = p.replace(/\/api\/(?!v\d+\/)/, '/api/v1/');

  if (!p.startsWith('/') && !p.startsWith('*')) p = `*${p}`;
  if (!p.endsWith('*')) p = `${p}|u:*`;

  return `${CACHE_ROOT}:${prefixo}:${p}`;
};

export const cacheResponse = (options: CacheOptions = {}) => {
  const duration = options.duration || 300;
  const keyPrefix = options.keyPrefix || 'response';
  const excludeParams = options.excludeParams || [];

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.method !== 'GET') {
      next();
      return;
    }

    const { userId, tokenInvalido } = resolverUsuario(req);
    if (tokenInvalido) {
      // Token inválido/expirado: não usar cache; a rota decide (401 ou resposta pública)
      next();
      return;
    }

    const key = buildCacheKey(keyPrefix, montarUrl(req, excludeParams), userId);

    try {
      const cachedData = await cacheService.get(key);

      if (cachedData) {
        res.setHeader('X-Cache', 'HIT');
        res.json(cachedData);
        return;
      }

      const originalJson = res.json.bind(res);
      (res as any).json = function (body: any): any {
        const ok = res.statusCode >= 200 && res.statusCode < 300;
        if (ok && body && body.success !== false) {
          cacheService.set(key, body, duration).catch(err => logger.error('Cache set error:', err));
        }
        if (!res.headersSent) res.setHeader('X-Cache', 'MISS');
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

export const cacheStatsResponse = (duration: number = 60) => {
  return cacheResponse({ duration, keyPrefix: 'stats' });
};

/** Invalida chaves que correspondem ao padrão (ver formato no topo do ficheiro). */
export const invalidateCache = async (pattern: string): Promise<number> => {
  return cacheService.delPattern(normalizarPadraoCache(pattern));
};

/** Invalida toda a cache de um utilizador específico. */
export const invalidateUserCache = async (userId: string): Promise<number> => {
  return cacheService.delPattern(`${CACHE_ROOT}:*|u:${userId}`);
};

export type CachePattern = string | ((req: Request) => string | string[] | null | undefined);

const resolverPadroes = (req: Request, patterns: CachePattern[]): string[] => {
  const lista: string[] = [];
  for (const p of patterns) {
    try {
      const v = typeof p === 'function' ? p(req) : p;
      if (Array.isArray(v)) lista.push(...v.filter(Boolean));
      else if (v) lista.push(v);
    } catch (err) {
      logger.error('Cache pattern error:', err);
    }
  }
  return lista;
};

/**
 * Invalida a cache após uma escrita bem sucedida (status < 400 e success !== false).
 * A invalidação ocorre ANTES de enviar a resposta JSON, para que o cliente não leia dados antigos.
 */
export const invalidateOnWrite = (patterns: CachePattern[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    let feito = false;

    const invalidar = async () => {
      if (feito) return;
      feito = true;
      for (const pattern of resolverPadroes(req, patterns)) {
        await invalidateCache(pattern).catch(err => logger.error('Cache invalidate error:', err));
      }
    };

    const originalJson = res.json.bind(res);
    (res as any).json = function (body: any): any {
      const ok = res.statusCode < 400 && !(body && body.success === false);
      if (!ok || feito) return originalJson(body);
      invalidar().finally(() => originalJson(body));
      return res;
    };

    // Respostas sem res.json (send/end/204): invalidar depois de terminar
    res.on('finish', () => {
      if (!feito && res.statusCode < 400) {
        invalidar().catch(() => undefined);
      }
    });

    next();
  };
};
