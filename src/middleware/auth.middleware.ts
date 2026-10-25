import { Request, Response, NextFunction } from 'express';
import { verificarToken } from '../utils/jwt';
import prisma from '../config/database';

export interface AuthRequest extends Request {
  usuarioId?: string;
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
      res.status(401).json({ success: false, error: 'Não autorizado' });
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
      res.status(401).json({ success: false, error: 'Não autorizado' });
      return;
    }

    req.usuarioId = usuario.id_usuario;
    req.usuario = usuario;

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ success: false, error: 'Token expirado' });
    } else if (error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
      res.status(401).json({ success: false, error: 'Token inválido' });
    } else {
      res.status(500).json({ success: false, error: 'Erro ao autenticar' });
    }
  }
};

/**
 * Autenticação opcional: se houver um Bearer token válido de um utilizador activo,
 * preenche req.usuarioId/req.usuario; caso contrário segue como anónimo (nunca responde 401).
 */
export const autenticarOpcional = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const decoded = verificarToken(authHeader.split(' ')[1]);
      const usuario = await prisma.usuario.findUnique({
        where: { id_usuario: decoded.id },
        select: { id_usuario: true, nome: true, email: true, tipo: true, status: true }
      });
      if (usuario && usuario.status === 'ativo') {
        req.usuarioId = usuario.id_usuario;
        req.usuario = usuario;
      }
    }
  } catch {
    // token inválido/expirado: tratar como anónimo
  }
  next();
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
      res.status(403).json({ success: false, error: 'Acesso restrito a fazedores de moda' });
      return;
    }

    (req as any).fazedorId = fazedor.id_fazedor;
    (req as any).fazedor = fazedor;

    next();
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao verificar permissões' });
  }
};

export const verificarAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.usuarioId) {
      res.status(401).json({ success: false, error: 'Não autorizado' });
      return;
    }

    const user = await prisma.usuario.findUnique({
      where: { id_usuario: req.usuarioId },
      select: { tipo: true }
    });

    if (!user || user.tipo !== 'sistem_admin') {
      res.status(403).json({ success: false, error: 'Acesso negado. Apenas administradores.' });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao verificar permissões' });
  }
};
