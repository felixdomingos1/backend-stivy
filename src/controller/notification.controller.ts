import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth.middleware';
import { NotificacaoRepository } from '../repositories/notificacao.repository';
import { NotificationService } from '../services/notification.service';
import { sendDomainError } from '../services/authorization.service';
import logger from '../utils/logger';

export class NotificationController {
  private notificationService: NotificationService;

  constructor() {
    const notificacaoRepository = new NotificacaoRepository();
    this.notificationService = new NotificationService(notificacaoRepository);
  }

  async listarNotificacoes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const { tipo, lida, data_inicio, data_fim } = req.query;
      const page = Math.max(parseInt(String(req.query.page ?? '1'), 10) || 1, 1);
      const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '20'), 10) || 20, 1), 100);

      const filters = {
        tipo: tipo as string,
        lida: lida === 'true' ? true : lida === 'false' ? false : undefined,
        data_inicio: data_inicio ? new Date(data_inicio as string) : undefined,
        data_fim: data_fim ? new Date(data_fim as string) : undefined
      };

      const result = await this.notificationService.listarNotificacoes(
        req.usuarioId,
        filters,
        Number(page),
        Number(limit)
      );

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listarNaoLidas(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const [notificacoes, count] = await Promise.all([
        this.notificationService.listarNaoLidas(req.usuarioId),
        this.notificationService.contarNaoLidas(req.usuarioId)
      ]);

      res.status(200).json({
        success: true,
        data: notificacoes,
        count,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async contarNaoLidas(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }
      const count = await this.notificationService.contarNaoLidas(req.usuarioId);
      res.status(200).json({ success: true, data: { count } });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async removerTodas(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }
      const result = await this.notificationService.removerTodas(req.usuarioId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getUltimasNotificacoes(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const notificacoes = await this.notificationService.getUltimasNotificacoes(req.usuarioId, limit);

      res.status(200).json({
        success: true,
        data: notificacoes,
        count: notificacoes.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async buscarNotificacaoPorId(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const notificacao = await this.notificationService.buscarNotificacaoPorId(id, req.usuarioId);

      res.status(200).json({
        success: true,
        data: notificacao,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async marcarComoLida(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const notificacao = await this.notificationService.marcarComoLida(id, req.usuarioId);

      res.status(200).json({
        success: true,
        data: notificacao,
        message: 'Notificação marcada como lida com sucesso',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async marcarTodasComoLidas(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const result = await this.notificationService.marcarTodasComoLidas(req.usuarioId);

      res.status(200).json({
        success: true,
        data: result,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async removerNotificacao(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await this.notificationService.removerNotificacao(id, req.usuarioId);

      res.status(200).json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getEstatisticas(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const estatisticas = await this.notificationService.getEstatisticas(req.usuarioId);

      res.status(200).json({
        success: true,
        data: estatisticas,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async limparNotificacoesAntigas(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const dias = req.query.dias ? Number(req.query.dias) : 30;
      const result = await this.notificationService.limparNotificacoesAntigas(req.usuarioId, dias);

      res.status(200).json({
        success: true,
        data: result,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  private handleError(error: any, res: Response): void {
    logger.error('Erro no NotificationController:', error);
    sendDomainError(error, res, 'NOTIFICATION_CONTROLLER');
  }
}
