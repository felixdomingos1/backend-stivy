import winston from 'winston';
import path from 'path';

const logDir = 'logs';

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.prettyPrint()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log')
    })
  ]
});

// Consola sempre activa: em produção (Render/Docker) é o stdout que aparece nos logs do painel.
logger.add(new winston.transports.Console({
  format: process.env.NODE_ENV === 'development'
    ? winston.format.combine(winston.format.colorize(), winston.format.simple())
    : winston.format.combine(winston.format.timestamp(), winston.format.simple())
}));

export default logger;
