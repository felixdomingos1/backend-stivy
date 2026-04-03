import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';

export const gerarToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, process.env.JWT_SECRET!);
};

export const verificarToken = (token: string): JwtPayload => {
  return jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
};
