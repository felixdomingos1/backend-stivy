import winston from 'winston';
import path from 'path';

const logDir = 'logs';

/**
 * Acrescenta à mensagem os argumentos extra de `logger.x('texto:', erro)`.
 * Sem isto o winston descarta-os e o log fica sem o motivo do erro.
 */
const anexarArgumentos = winston.format((info) => {
  const extra = (info[Symbol.for('splat') as any] as unknown[] | undefined) ?? [];
  const partes = extra.map((a) => {
    if (a instanceof Error) return a.stack || a.message;
    if (a && typeof a === 'object') {
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    }
    return String(a);
  });
  if (partes.length) info.message = `${info.message} ${partes.join(' ')}`;
  return info;
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    anexarArgumentos(),
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
