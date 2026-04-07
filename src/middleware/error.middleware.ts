import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import logger from '../utils/logger';

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
  if (err.array && typeof err.array === 'function') {
    return err.array().map((e: any) => ({
      field: e.param,
      message: e.msg
    }));
  }
  return null;
};

export const handlePrismaError = (err: Prisma.PrismaClientKnownRequestError): { status: number; message: string; code?: string } => {
  const errorConfig = errorMap[err.code];

  if (errorConfig) {
    return {
      status: errorConfig.status,
      message: errorConfig.message,
      code: err.code
    };
  }

  if (err.code === 'P2002') {
    const target = (err.meta?.target as string[])?.join(', ') || 'campo';
    return {
      status: 409,
      message: `Já existe um registro com ${target}`,
      code: err.code
    };
  }

  if (err.code === 'P2025') {
    return {
      status: 404,
      message: 'Registro não encontrado',
      code: err.code
    };
  }

  return {
    status: 400,
    message: err.message,
    code: err.code
  };
};

export const handleJWTError = (err: any): { status: number; message: string } => {
  if (err.name === 'JsonWebTokenError') {
    return { status: 401, message: 'Token inválido' };
  }
  if (err.name === 'TokenExpiredError') {
    return { status: 401, message: 'Token expirado' };
  }
  return { status: 401, message: 'Erro de autenticação' };
};

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
): void => {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: (req as any).usuarioId,
    body: process.env.NODE_ENV === 'development' ? req.body : undefined
  });

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
    return;
  }

  const validationErrors = handleValidationErrors(err);
  if (validationErrors) {
    res.status(400).json({
      success: false,
      error: 'Erro de validação',
      errors: validationErrors
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const { status, message, code } = handlePrismaError(err);
    res.status(status).json({
      success: false,
      error: message,
      code,
      ...(process.env.NODE_ENV === 'development' && { prismaCode: err.code })
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    res.status(500).json({
      success: false,
      error: 'Erro de conexão com o banco de dados'
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      success: false,
      error: 'Dados inválidos para a operação'
    });
    return;
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    const { status, message } = handleJWTError(err);
    res.status(status).json({
      success: false,
      error: message
    });
    return;
  }

  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      success: false,
      error: 'JSON inválido'
    });
    return;
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({
      success: false,
      error: 'Arquivo muito grande',
      maxSize: process.env.MAX_FILE_SIZE
    });
    return;
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    res.status(400).json({
      success: false,
      error: 'Tipo de arquivo não permitido'
    });
    return;
  }

  if (err.message === 'Rate limit exceeded') {
    res.status(429).json({
      success: false,
      error: 'Muitas requisições. Tente novamente mais tarde'
    });
    return;
  }
  const isDevelopment = process.env.NODE_ENV === 'development';
  res.status(err.status || 500).json({
    success: false,
    error: isDevelopment ? err.message : 'Erro interno do servidor',
    ...(isDevelopment && { stack: err.stack })
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Rota não encontrada: ${req.method} ${req.url}`,
    path: req.url,
    method: req.method
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
