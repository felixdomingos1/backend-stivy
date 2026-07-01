import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { validationResult } from 'express-validator';
import { RequisicaoRepository } from '../repositories/requisicao.repository';
import { ServicoRepository } from '../repositories/servico.repository';
import { ModeloRepository } from '../repositories/modelo.repository';
import { NotificacaoRepository } from '../repositories/notificacao.repository';
import { CreateRequisicaoDto } from '../dtos/request.dto';
import logger from '../utils/logger';
import { ValidationError, NotFoundError } from '../utils/errors';
import { RequestService } from '../services/request.service';

export class RequestController {
  private requestService: RequestService;

  constructor() {
    const requisicaoRepository = new RequisicaoRepository();
    const servicoRepository = new ServicoRepository();
    const modeloRepository = new ModeloRepository();
    const notificacaoRepository = new NotificacaoRepository();
    this.requestService = new RequestService(
      requisicaoRepository,
      servicoRepository,
      modeloRepository,
      notificacaoRepository
    );
  }

  async requisitarServico(req: AuthRequest, res: Response): Promise<void> {
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

      const id_servico = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const dto: CreateRequisicaoDto = req.body;
      const result = await this.requestService.requisitarServico(
        req.usuarioId,
        id_servico,
        dto
      );

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async requisitarModelo(req: AuthRequest, res: Response): Promise<void> {
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
      const id_modelo = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      const dto: CreateRequisicaoDto = req.body;
      const result = await this.requestService.requisitarModelo(
        req.usuarioId,
        id_modelo,
        dto
      );

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async buscarRequisicaoPorId(req: AuthRequest, res: Response): Promise<void> {
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
      const result = await this.requestService.getRequisicaoById(id, req.usuarioId);

      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listarMinhasRequisicoes(req: AuthRequest, res: Response): Promise<void> {
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

      const { status, data_inicio, data_fim, page = 1, limit = 20 } = req.query;

      const filters = {
        status: status as string,
        data_inicio: data_inicio ? new Date(data_inicio as string) : undefined,
        data_fim: data_fim ? new Date(data_fim as string) : undefined
      };

      const result = await this.requestService.listMinhasRequisicoes(
        req.usuarioId,
        filters,
        Number(page),
        Number(limit)
      );

      res.json(result);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listarRequisicoesRecebidas(req: AuthRequest, res: Response): Promise<void> {
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

      const { status, data_inicio, data_fim, page = 1, limit = 20 } = req.query;

      const filters = {
        status: status as string,
        data_inicio: data_inicio ? new Date(data_inicio as string) : undefined,
        data_fim: data_fim ? new Date(data_fim as string) : undefined
      };

      const result = await this.requestService.listRequisicoesRecebidas(
        req.usuarioId,
        filters,
        Number(page),
        Number(limit)
      );

      res.json(result);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async aceitarRequisicao(req: AuthRequest, res: Response): Promise<void> {
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
      const result = await this.requestService.aceitarRequisicao(id, req.usuarioId);

      res.json({ success: true, data: result, message: 'Requisição aceita com sucesso' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async recusarRequisicao(req: AuthRequest, res: Response): Promise<void> {
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
      const { motivo } = req.body;
      const result = await this.requestService.recusarRequisicao(id, req.usuarioId, motivo);

      res.json({ success: true, data: result, message: 'Requisição recusada' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async cancelarRequisicao(req: AuthRequest, res: Response): Promise<void> {
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
      const result = await this.requestService.cancelarRequisicao(id, req.usuarioId);

      res.json({ success: true, data: result, message: 'Requisição cancelada' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async concluirRequisicao(req: AuthRequest, res: Response): Promise<void> {
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
      const result = await this.requestService.concluirRequisicao(id, req.usuarioId);

      res.json({ success: true, data: result, message: 'Requisição concluída com sucesso' });
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

      const result = await this.requestService.getEstatisticas(req.usuarioId);
      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  private handleError(error: any, res: Response): void {
    logger.error('Erro no RequestController:', error);

    if (error instanceof ValidationError) {
      res.status(400).json({ success: false, error: error.message });
    } else if (error instanceof NotFoundError) {
      res.status(404).json({ success: false, error: error.message });
    } else {
      const message = process.env.NODE_ENV === 'development'
        ? error.message
        : 'Erro interno do servidor';
      res.status(500).json({ success: false, error: message });
    }
  }
}
