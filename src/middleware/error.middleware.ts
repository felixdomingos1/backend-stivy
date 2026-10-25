import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import logger from '../utils/logger';
import { getErrorStatus } from '../utils/errors';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

interface ValidationError {
  field: string;
  message: string;
}

const errorMap: Record<string, { status: number; message: string }> = {
  'P2000': { status: 400, message: 'Valor muito longo para o campo' },
  'P2001': { status: 404, message: 'Registro não encontrado' },
  'P2002': { status: 409, message: 'Registro duplicado' },
  'P2003': { status: 400, message: 'Erro de chave estrangeira' },
  'P2004': { status: 400, message: 'Restrição de banco de dados violada' },
  'P2005': { status: 400, message: 'Valor inválido para o campo' },
  'P2006': { status: 400, message: 'Valor inválido' },
  'P2007': { status: 400, message: 'Erro de validação de dados' },
  'P2008': { status: 500, message: 'Erro na consulta' },
  'P2009': { status: 500, message: 'Erro na validação da consulta' },
  'P2010': { status: 500, message: 'Erro na execução da consulta' },
  'P2011': { status: 400, message: 'Violação de restrição NOT NULL' },
  'P2012': { status: 400, message: 'Valor ausente para campo obrigatório' },
  'P2013': { status: 400, message: 'Campo obrigatório ausente' },
  'P2014': { status: 409, message: 'Violação de relação' },
  'P2015': { status: 404, message: 'Registro relacionado não encontrado' },
  'P2016': { status: 500, message: 'Erro de interpretação de query' },
  'P2017': { status: 400, message: 'Relação não conectada' },
  'P2018': { status: 404, message: 'Registro conectado não encontrado' },
  'P2019': { status: 500, message: 'Erro de input' },
  'P2020': { status: 400, message: 'Valor fora do intervalo' },
  'P2021': { status: 500, message: 'Tabela não existe' },
  'P2022': { status: 500, message: 'Coluna não existe' },
  'P2023': { status: 400, message: 'Dados inconsistentes' },
  'P2024': { status: 408, message: 'Timeout na conexão' },
  'P2025': { status: 404, message: 'Registro não encontrado para operação' },
  'P2026': { status: 400, message: 'Provedor de banco de dados não suportado' },
  'P2027': { status: 500, message: 'Erro múltiplo no banco de dados' },
};

export const handleValidationErrors = (err: any): ValidationError[] | null => {
  if (err && err.array && typeof err.array === 'function') {
    return err.array().map((e: any) => ({
      field: e.path ?? e.param,
      message: e.msg
    }));
  }
  return null;
};

export const handlePrismaError = (err: Prisma.PrismaClientKnownRequestError): { status: number; message: string; code?: string } => {
  if (err.code === 'P2002') {
    const rawTarget = err.meta?.target;
    const target = Array.isArray(rawTarget) ? rawTarget.join(', ') : (rawTarget as string) || 'campo';
    return { status: 409, message: `Já existe um registro com ${target}`, code: err.code };
  }

  if (err.code === 'P2025') {
    return { status: 404, message: 'Registro não encontrado', code: err.code };
  }

  if (err.code === 'P2003') {
    return { status: 400, message: 'Referência inválida (registro relacionado não existe)', code: err.code };
  }

  const errorConfig = errorMap[err.code];
  if (errorConfig) {
    return { status: errorConfig.status, message: errorConfig.message, code: err.code };
  }

  return { status: 400, message: 'Erro na operação de base de dados', code: err.code };
};

export const handleJWTError = (err: any): { status: number; message: string } => {
  if (err.name === 'JsonWebTokenError') {
    return { status: 401, message: 'Token inválido' };
  }
  if (err.name === 'TokenExpiredError') {
    return { status: 401, message: 'Token expirado' };
  }
  return { status: 401, message: 'Não autorizado' };
};

const MULTER_MENSAGENS: Record<string, { status: number; message: string }> = {
  LIMIT_FILE_SIZE: { status: 413, message: 'Arquivo muito grande' },
  LIMIT_FILE_COUNT: { status: 400, message: 'Número máximo de arquivos excedido' },
  LIMIT_FIELD_COUNT: { status: 400, message: 'Demasiados campos no formulário' },
  LIMIT_FIELD_KEY: { status: 400, message: 'Nome de campo demasiado longo' },
  LIMIT_FIELD_VALUE: { status: 413, message: 'Valor de campo demasiado longo' },
  LIMIT_PART_COUNT: { status: 400, message: 'Demasiadas partes no formulário' },
  LIMIT_UNEXPECTED_FILE: { status: 400, message: 'Campo de arquivo inesperado ou tipo não permitido' },
};

/**
 * Handler global de erros (4 parâmetros — obrigatório para o Express o reconhecer como error handler).
 * Responde SEMPRE em JSON `{ success: false, error, errors? }`; nunca envia stack em produção.
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const isDevelopment = process.env.NODE_ENV === 'development';
  const send = (status: number, payload: Record<string, any>) => {
    res.status(status).json({ success: false, ...payload });
  };

  // Erros de domínio (utils/errors.ts) e AppError
  const domainStatus = getErrorStatus(err);
  if (err instanceof AppError || domainStatus) {
    const status = err instanceof AppError ? err.statusCode : domainStatus!;
    if (status >= 500) logError(err, req);
    send(status, { error: err.message, ...(err.code && typeof err.code === 'string' ? { code: err.code } : {}) });
    return;
  }

  // JSON mal formado (express.json)
  if (err instanceof SyntaxError && (err as any).type === 'entity.parse.failed') {
    send(400, { error: 'JSON inválido' });
    return;
  }

  // Corpo demasiado grande (express.json / urlencoded)
  if (err?.type === 'entity.too.large') {
    send(413, { error: 'Pedido demasiado grande' });
    return;
  }

  // Multer
  if (err instanceof multer.MulterError || (typeof err?.code === 'string' && err.code.startsWith('LIMIT_'))) {
    const conf = MULTER_MENSAGENS[err.code] ?? { status: 400, message: 'Erro no upload de arquivo' };
    send(conf.status, {
      error: conf.message,
      ...(err.code === 'LIMIT_FILE_SIZE' && process.env.MAX_FILE_SIZE ? { maxSize: Number(process.env.MAX_FILE_SIZE) } : {})
    });
    return;
  }

  const validationErrors = handleValidationErrors(err);
  if (validationErrors) {
    send(400, { error: validationErrors[0]?.message || 'Erro de validação', errors: validationErrors });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const { status, message, code } = handlePrismaError(err);
    if (status >= 500) logError(err, req);
    send(status, { error: message, code });
    return;
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    logError(err, req);
    send(400, { error: 'Dados inválidos para a operação' });
    return;
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    logError(err, req);
    send(503, { error: 'Erro de conexão com o banco de dados' });
    return;
  }

  if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
    const { status, message } = handleJWTError(err);
    send(status, { error: message });
    return;
  }

  if (err?.message === 'Rate limit exceeded') {
    send(429, { error: 'Muitas requisições. Tente novamente mais tarde' });
    return;
  }

  // Erros HTTP genéricos (ex.: http-errors / body-parser) com status 4xx explícito
  const explicitStatus = Number(err?.status || err?.statusCode);
  if (explicitStatus >= 400 && explicitStatus < 500) {
    send(explicitStatus, { error: err.expose === false ? 'Pedido inválido' : (err.message || 'Pedido inválido') });
    return;
  }

  logError(err, req);
  send(500, {
    error: isDevelopment ? (err?.message || 'Erro interno do servidor') : 'Erro interno do servidor',
    ...(isDevelopment && err?.stack ? { stack: err.stack } : {})
  });
};

const logError = (err: any, req: Request) => {
  logger.error({
    message: err?.message,
    stack: err?.stack,
    url: req.originalUrl || req.url,
    method: req.method,
    ip: req.ip,
    userId: (req as any).usuarioId,
  });
};

export const notFoundHandler = (req: Request, res: Response, _next?: NextFunction) => {
  res.status(404).json({
    success: false,
    error: `Rota não encontrada: ${req.method} ${req.originalUrl || req.url}`,
    path: req.originalUrl || req.url,
    method: req.method
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
