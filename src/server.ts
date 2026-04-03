import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

console.log('🚀 Iniciando servidor STIVY...');
console.log(`📦 Ambiente: ${process.env.NODE_ENV || 'development'}`);

// Importar Redis
import { connectRedis, isRedisReady, getRedisClient } from './config/redis';
import logger from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import routes from './routes';

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middlewares globais
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(compression());
app.use(morgan('combined', { stream: { write: (msg) => console.log(msg.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rota de saúde
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    redis: isRedisReady() ? 'connected' : 'disconnected'
  });
});

// Rota para verificar status do Redis
app.get('/redis-status', async (req, res) => {
  try {
    const ready = isRedisReady();
    let pingResult = 'unknown';

    if (ready) {
      try {
        const client = getRedisClient();
        const ping = await client.ping();
        pingResult = ping === 'PONG' ? 'OK' : 'FAIL';
      } catch (pingError: any) {
        pingResult = `ERROR: ${pingError.message}`;
      }
    }

    res.json({
      connected: ready,
      ready: ready,
      ping: pingResult,
      config: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Erro na rota /redis-status:', error);
    res.status(500).json({
      connected: false,
      error: error.message
    });
  }
});

// Rotas da API
app.use('/api', routes);

// Middleware para rotas não encontradas
app.use(notFoundHandler);

// Middleware de erro
app.use(errorHandler);

// Iniciar servidor - AGUARDAR REDIS CONECTAR
async function startServer(): Promise<void> {
  console.log('🔄 Conectando ao Redis...');

  // Aguardar conexão do Redis antes de iniciar o servidor
  const redisConnected = await connectRedis();

  if (redisConnected) {
    console.log('✅ Redis conectado e funcionando!');

    // Teste adicional
    const client = getRedisClient();
    await client.set('stivy:startup', new Date().toISOString());
    console.log('✅ Redis testado e pronto!');
  } else {
    console.warn('⚠️ Redis NÃO conectado. O servidor continuará sem cache.');
  }

  console.log(`🚀 Iniciando servidor na porta ${PORT}...`);

  app.listen(PORT, () => {
    console.log(`
    SERVIDOR STIVY INICIADO COM SUCESSO!
    API: http://localhost:${PORT}
    Ambiente: ${process.env.NODE_ENV || 'development'}
    Redis: ${redisConnected ? '✅ CONECTADO' : '❌ DESCONECTADO'}
    Health: http://localhost:${PORT}/health
    Redis Status: http://localhost:${PORT}/redis-status
    `);
  });
}

startServer().catch((error) => {
  console.error('❌ Erro fatal ao iniciar servidor:', error);
  process.exit(1);
});

export default app;
