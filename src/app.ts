import express, { Application, Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import routes from './routes';
import prisma from './config/database';
import { isRedisReady, getRedisClient } from './config/redis';
import logger from './utils/logger';

const app: Application = express();

// Atrás de um proxy/reverse-proxy (nginx, Render, etc.): req.ip correcto para rate limit
app.set('trust proxy', 1);
app.disable('x-powered-by');

/**
 * CORS:
 *  - CORS_ORIGIN definido: lista separada por vírgulas; aceita curingas (ex.: http://192.168.*), com credentials.
 *  - CORS_ORIGIN vazio: em desenvolvimento permite qualquer origem SEM credentials;
 *    em produção bloqueia pedidos cross-origin de browsers (apps móveis não enviam Origin).
 */
const construirCors = (): CorsOptions => {
  const base: CorsOptions = {
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  };

  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      logger.warn('[CORS] CORS_ORIGIN não definido em produção: pedidos cross-origin de browsers serão bloqueados.');
      return { ...base, origin: false, credentials: false };
    }
    return { ...base, origin: '*', credentials: false };
  }

  const entradas = raw.split(',').map(o => o.trim()).filter(Boolean);
  if (entradas.includes('*')) {
    return { ...base, origin: '*', credentials: false };
  }

  const permitidas = entradas.map(o =>
    o.includes('*')
      ? new RegExp('^' + o.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$')
      : o
  );

  return {
    ...base,
    credentials: true,
    origin: (origin, callback) => {
      // Sem Origin (apps móveis, curl, server-to-server): permitir
      if (!origin) return callback(null, true);
      const ok = permitidas.some(p => (typeof p === 'string' ? p === origin : p.test(origin)));
      callback(null, ok);
    },
  };
};

app.use(helmet());
app.use(cors(construirCors()));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const health = async (_req: Request, res: Response) => {
  let database: 'connected' | 'error' = 'connected';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error: any) {
    database = 'error';
    logger.error(`[HEALTH] Base de dados indisponível: ${error?.message}`);
  }

  const redis = isRedisReady() ? 'connected' : 'disconnected';
  res.status(database === 'connected' ? 200 : 503).json({
    status: database === 'connected' ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    services: { database, redis }
  });
};

app.get('/health', health);
app.get('/api/v1/health', health);

app.get('/redis-status', async (_req: Request, res: Response) => {
  const ready = isRedisReady();
  let ping = 'unavailable';
  if (ready) {
    try {
      ping = (await getRedisClient().ping()) === 'PONG' ? 'OK' : 'FAIL';
    } catch {
      ping = 'ERROR';
    }
  }
  res.json({ connected: ready, ready, ping, timestamp: new Date().toISOString() });
});

app.use('/api/v1', routes);

// 404 e handler de erros (4 parâmetros) — SEMPRE no fim
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
