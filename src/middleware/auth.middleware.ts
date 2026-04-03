import { Request, Response, NextFunction } from 'express';
import { verificarToken } from '../utils/jwt';
import prisma from '../config/database';

export interface AuthRequest extends Request {
  usuarioId?: number;
  usuario?: any;
}

export const autenticar = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token não fornecido' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verificarToken(token);

    const usuario = await prisma.usuario.findUnique({
      where: { id_usuario: decoded.id },
      select: {
        id_usuario: true,
        nome: true,
        email: true,
        tipo: true,
        status: true
      }
    });

    if (!usuario || usuario.status !== 'ativo') {
      res.status(401).json({ error: 'Usuário inválido ou inativo' });
      return;
    }

    req.usuarioId = usuario.id_usuario;
    req.usuario = usuario;

    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({ error: 'Token inválido' });
    } else if (error.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Token expirado' });
    } else {
      res.status(500).json({ error: 'Erro ao autenticar' });
    }
  }
};

export const verificarFazedor = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const fazedor = await prisma.fazedor.findUnique({
      where: { id_usuario: req.usuarioId }
    });

    if (!fazedor) {
      res.status(403).json({ error: 'Acesso restrito a fazedores de moda' });
      return;
    }

    (req as any).fazedorId = fazedor.id_fazedor;
    (req as any).fazedor = fazedor;

    next();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar permissões' });
  }
};
