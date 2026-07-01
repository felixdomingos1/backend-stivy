// backend/src/server.ts (atualizado)
import dotenv from 'dotenv';

dotenv.config();

console.log('🚀 Iniciando servidor STIVY...');
console.log(`📦 Ambiente: ${process.env.NODE_ENV || 'development'}`);
import { connectRedis, isRedisReady, getRedisClient } from './config/redis';
import app from './app';
import { EmailService } from './services/email.service';
import logger from './utils/logger';
import { configureSocket } from './config/socket';
import { createServer } from 'http';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

async function startServer(): Promise<void> {
  console.log('🔄 Conectando ao Redis...');
  const redisConnected = await connectRedis();
  const emailService = EmailService.getInstance();

  if (redisConnected) {
    console.log('✅ Redis conectado e funcionando!');
    const client = getRedisClient();
    await client.set('stivy:startup', new Date().toISOString());
    console.log('✅ Redis testado e pronto!');
  } else {
    console.warn('⚠️ Redis NÃO conectado. O servidor continuará sem cache.');
  }

  await emailService.initialize().catch(error => {
    logger.warn('⚠️ Email service não está disponível:', error.message);
  });

  // Criar servidor HTTP e configurar Socket.IO
  const httpServer = createServer(app);
  const io = configureSocket(httpServer);

  // Disponibilizar io para os controllers/services
  app.set('io', io);

  // Rota de status do Redis
  if (process.env.NODE_ENV !== 'test') {
    app.get('/redis-status', async (_, res) => {
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
        logger.error('Erro na rota /redis-status:', error);
        res.status(500).json({
          connected: false,
          error: error.message
        });
      }
    });
  }

  console.log(`🚀 Iniciando servidor na porta ${PORT}...`);
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`
    SERVIDOR STIVY INICIADO COM SUCESSO!
    API: http://localhost:${PORT}/api/v1
    WebSocket: ws://localhost:${PORT}
    Ambiente: ${process.env.NODE_ENV || 'development'}
    Redis: ${redisConnected ? '✅ CONECTADO' : '❌ DESCONECTADO'}
    Health: http://localhost:${PORT}/api/v1/health
    `);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((error) => {
    logger.error('❌ Erro fatal ao iniciar servidor:', error);
    process.exit(1);
  });
}

export default app;
