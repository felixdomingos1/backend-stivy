import { Router } from 'express';
import { body, param } from 'express-validator';
import { autenticar } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import prisma from '../config/database';
import logger from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.use(autenticar);

router.post('/',
  [
    body('token')
      .notEmpty().withMessage('Token é obrigatório')
      .isString().withMessage('Token deve ser uma string'),
    body('plataforma')
      .notEmpty().withMessage('Plataforma é obrigatória')
      .isIn(['ios', 'android', 'web']).withMessage('Plataforma deve ser ios, android ou web'),
  ],
  validate,
  async (req: AuthRequest, res: any) => {
    try {
      if (!req.usuarioId) {
        return res.status(401).json({ error: 'Não autorizado' });
      }

      const { token, plataforma } = req.body;

      const deviceToken = await prisma.deviceToken.upsert({
        where: {
          id_usuario_token: {
            id_usuario: req.usuarioId,
            token,
          },
        },
        update: { plataforma },
        create: {
          id_usuario: req.usuarioId,
          token,
          plataforma,
        },
      });

      logger.info(`Device token registrado para usuário ${req.usuarioId}`);

      return res.status(201).json({
        success: true,
        message: 'Device token registrado com sucesso',
        data: deviceToken,
      });
    } catch (error: any) {
      logger.error('Erro ao registrar device token:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
);

router.delete('/:token',
  [
    param('token')
      .notEmpty().withMessage('Token é obrigatório'),
  ],
  validate,
  async (req: AuthRequest, res: any) => {
    try {
      if (!req.usuarioId) {
        return res.status(401).json({ error: 'Não autorizado' });
      }

      const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;

      await prisma.deviceToken.deleteMany({
        where: {
          id_usuario: req.usuarioId,
          token: token,
        },
      });

      logger.info(`Device token removido para usuário ${req.usuarioId}`);

      return res.json({
        success: true,
        message: 'Device token removido com sucesso',
      });
    } catch (error: any) {
      logger.error('Erro ao remover device token:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
);

export default router;
