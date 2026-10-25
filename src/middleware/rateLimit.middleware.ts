import { Request, Response, NextFunction } from 'express';
import { rateLimiter } from '../config/redis';

interface RateLimitConfig {
  windowSeconds: number;
  maxRequests: number;
  message?: string;
  /** Nome do "balde": limitadores diferentes não partilham contadores. */
  nome?: string;
}

const defaultConfig: RateLimitConfig = {
  windowSeconds: 60,
  maxRequests: 100,
  message: 'Muitas requisições. Tente novamente mais tarde.'
};

let contadorAnonimo = 0;

/**
 * Rate limit por utilizador (se autenticado) ou IP. Usa Redis; se o Redis estiver em baixo
 * cai para um limitador em memória (config/redis.ts), em vez de permitir tudo.
 * Requer `app.set('trust proxy', 1)` atrás de proxy para req.ip correcto.
 */
export const rateLimit = (config: Partial<RateLimitConfig> = {}) => {
  const { windowSeconds, maxRequests, message } = { ...defaultConfig, ...config };
  const nome = config.nome || `rl${++contadorAnonimo}_${maxRequests}_${windowSeconds}`;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = (req as any).usuarioId;
    const identidade = userId ? `user:${userId}` : `ip:${req.ip}`;
    const finalKey = `${nome}:${identidade}`;

    const result = await rateLimiter.checkLimit(finalKey, maxRequests, windowSeconds);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetAt);

    if (!result.allowed) {
      const retryAfter = Math.max(1, result.resetAt - Math.floor(Date.now() / 1000));
      res.setHeader('Retry-After', retryAfter);
      res.status(429).json({
        success: false,
        error: message,
        retryAfter
      });
      return;
    }

    next();
  };
};

export const strictRateLimit = rateLimit({ nome: 'strict', windowSeconds: 60, maxRequests: 10 });
/** Login/registo/recuperação de senha: 10 pedidos por 5 min por IP. */
export const authRateLimit = rateLimit({ nome: 'auth', windowSeconds: 300, maxRequests: 10 });
/** Verificação/reenvio de códigos OTP: 10 pedidos por 10 min por IP. */
export const otpRateLimit = rateLimit({
  nome: 'otp',
  windowSeconds: 600,
  maxRequests: 10,
  message: 'Demasiadas tentativas de código. Aguarde alguns minutos e tente novamente.'
});
/** Renovação de tokens: 30 por minuto por IP. */
export const refreshTokenRateLimit = rateLimit({ nome: 'refresh', windowSeconds: 60, maxRequests: 30 });
export const searchRateLimit = rateLimit({ nome: 'search', windowSeconds: 60, maxRequests: 30 });
export const apiRateLimit = rateLimit({ nome: 'api', windowSeconds: 60, maxRequests: 200 });
