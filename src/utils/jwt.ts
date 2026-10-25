import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';
import prisma from '../config/database';
import crypto from 'crypto';

const DEFAULT_EXPIRES_IN = '1d';
const REFRESH_TOKEN_DIAS = 7;

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET não configurado');
  }
  return secret;
};

/** Validade do access token: env JWT_EXPIRES_IN (ex.: '1d', '15m', '3600') ou '1d'. */
export const getAccessTokenExpiresIn = (): string => {
  const valor = process.env.JWT_EXPIRES_IN?.trim();
  return valor ? valor : DEFAULT_EXPIRES_IN;
};

/**
 * Gera um access token. Tem SEMPRE expiração: `time` (se dado) ou JWT_EXPIRES_IN (default '1d').
 */
export const gerarToken = (payload: JwtPayload, time?: string): string => {
  const expiresIn = (time || getAccessTokenExpiresIn()) as jwt.SignOptions['expiresIn'];
  // Copiar apenas os campos do contrato (evita reassinar exp/iat de um payload decodificado)
  const { id, email, tipo, isVerified } = payload;
  return jwt.sign({ id, email, tipo, isVerified }, getSecret(), { expiresIn });
};

export const verificarToken = (token: string): JwtPayload => {
  return jwt.verify(token, getSecret()) as JwtPayload;
};

export const generateAccessToken = (payload: JwtPayload): string => {
  return gerarToken(payload);
};

export const generateRefreshToken = async (userId: string): Promise<string> => {
  const token = crypto.randomBytes(40).toString('hex');
  const expires_at = new Date(Date.now() + REFRESH_TOKEN_DIAS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      id_usuario: userId,
      token,
      expires_at,
    },
  });

  return token;
};

export const verifyRefreshToken = async (token: string): Promise<{ id_usuario: string }> => {
  const stored = await prisma.refreshToken.findUnique({
    where: { token },
  });

  if (!stored || stored.revoked || stored.expires_at < new Date()) {
    throw new Error('Refresh token inválido ou expirado');
  }

  return { id_usuario: stored.id_usuario };
};

export class RefreshTokenInvalidoError extends Error {
  constructor(message = 'Refresh token inválido ou expirado') {
    super(message);
    this.name = 'RefreshTokenInvalidoError';
  }
}

/**
 * Rotação de refresh token: revoga o token apresentado (de forma atómica) e emite um novo.
 * Detecção de reutilização: se o token já estava revogado, assume-se roubo e
 * revogam-se TODOS os refresh tokens do utilizador.
 */
export const rotateRefreshToken = async (
  token: string
): Promise<{ id_usuario: string; refreshToken: string }> => {
  const stored = await prisma.refreshToken.findUnique({ where: { token } });

  if (!stored) {
    throw new RefreshTokenInvalidoError();
  }

  if (stored.revoked) {
    await revokeAllUserTokens(stored.id_usuario);
    throw new RefreshTokenInvalidoError('Refresh token reutilizado. Faça login novamente.');
  }

  if (stored.expires_at < new Date()) {
    throw new RefreshTokenInvalidoError();
  }

  // Revogar antes de emitir; updateMany condicional evita corrida entre dois pedidos simultâneos
  const { count } = await prisma.refreshToken.updateMany({
    where: { token, revoked: false },
    data: { revoked: true },
  });

  if (count === 0) {
    await revokeAllUserTokens(stored.id_usuario);
    throw new RefreshTokenInvalidoError('Refresh token reutilizado. Faça login novamente.');
  }

  const refreshToken = await generateRefreshToken(stored.id_usuario);
  return { id_usuario: stored.id_usuario, refreshToken };
};

export const revokeRefreshToken = async (token: string): Promise<void> => {
  await prisma.refreshToken.update({
    where: { token },
    data: { revoked: true },
  });
};

export const revokeAllUserTokens = async (userId: string): Promise<void> => {
  await prisma.refreshToken.updateMany({
    where: { id_usuario: userId, revoked: false },
    data: { revoked: true },
  });
};
