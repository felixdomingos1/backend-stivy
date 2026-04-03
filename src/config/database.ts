import { PrismaClient } from "@prisma/client";
import logger from "../utils/logger";

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
});

prisma.$connect()
  .then(() => logger.info('✅ Conectado ao MySQL via Prisma'))
  .catch((err) => logger.error('❌ Erro ao conectar ao MySQL:', err));

export default prisma;
