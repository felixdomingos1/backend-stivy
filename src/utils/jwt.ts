import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';
import prisma from '../config/database';
import crypto from 'crypto';

export const gerarToken = (payload: JwtPayload, time?: string): string => {
  const options: jwt.SignOptions = {};
  if (time) options.expiresIn = time as any;
  return jwt.sign(payload, process.env.JWT_SECRET!, options);
};

export const verificarToken = (token: string): JwtPayload => {
  return jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
};

export const generateAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '15m' });
};

export const generateRefreshToken = async (userId: string): Promise<string> => {
  const token = crypto.randomBytes(40).toString('hex');
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

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
