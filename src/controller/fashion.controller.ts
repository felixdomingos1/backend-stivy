import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { validationResult } from 'express-validator';
import { FashionService } from '../services/fashion.service';
import { ServicoRepository } from '../repositories/servico.repository';
import { FazedorRepository } from '../repositories/fazedor.repository';
import { AvaliacaoRepository } from '../repositories/avaliacao.repository';
import { CreateServicoDto, UpdateServicoDto } from '../dtos/fashion.dto';
import logger from '../utils/logger';
import { ValidationError, NotFoundError } from '../utils/errors';

export class FashionController {
  private fashionService: FashionService;

  constructor() {
    const servicoRepository = new ServicoRepository();
    const fazedorRepository = new FazedorRepository();
    const avaliacaoRepository = new AvaliacaoRepository();
    this.fashionService = new FashionService(
      servicoRepository,
      fazedorRepository,
      avaliacaoRepository
    );
  }

  async criarServico(req: AuthRequest, res: Response): Promise<void> {
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

      const dto: CreateServicoDto = req.body;
      const result = await this.fashionService.createServico(req.usuarioId, dto);

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async buscarServicoPorId(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await this.fashionService.getServicoById(id);

      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listarServicos(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const {
        categoria,
        min_valor,
        max_valor,
        status,
        search,
        page = 1,
        limit = 20
      } = req.query;

      const filters = {
        categoria: categoria as string,
        min_valor: min_valor ? parseFloat(min_valor as string) : undefined,
        max_valor: max_valor ? parseFloat(max_valor as string) : undefined,
        status: status as string,
        search: search as string
      };

      const result = await this.fashionService.listServicos(
        filters,
        Number(page),
        Number(limit)
      );

      res.json(result);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async atualizarServico(req: AuthRequest, res: Response): Promise<void> {
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
      const dto: UpdateServicoDto = req.body;
      const result = await this.fashionService.updateServico(id, req.usuarioId, dto);

      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async removerServico(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await this.fashionService.deleteServico(id, req.usuarioId);

      res.json({ success: true, message: 'Serviço removido com sucesso' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async buscarFazedorPorId(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await this.fashionService.getFazedorById(id);

      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listarFazedores(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const {
        tipo_fazedor,
        status_aprovacao,
        avaliacao_minima,
        search,
        page = 1,
        limit = 20
      } = req.query;

      const filters = {
        tipo_fazedor: tipo_fazedor as string,
        status_aprovacao: status_aprovacao as string,
        avaliacao_minima: avaliacao_minima ? parseFloat(avaliacao_minima as string) : undefined,
        search: search as string
      };

      const result = await this.fashionService.listFazedores(
        filters,
        Number(page),
        Number(limit)
      );

      res.json(result);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listarServicosDoFazedor(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await this.fashionService.getServicosDoFazedor(id);

      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async avaliarFazedor(req: AuthRequest, res: Response): Promise<void> {
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

      const id_fazedor = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { nota, comentario } = req.body;

      const result = await this.fashionService.avaliarFazedor(
        req.usuarioId,
        id_fazedor,
        nota,
        comentario
      );

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listarAvaliacoesDoFazedor(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { page = 1, limit = 20 } = req.query;

      const result = await this.fashionService.getAvaliacoesDoFazedor(
        id,
        Number(page),
        Number(limit)
      );

      res.json(result);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getCategoriasServicos(_: Request, res: Response): Promise<void> {
    try {
      const result = await this.fashionService.getCategoriasServicos();
      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getTiposFazedores(_: Request, res: Response): Promise<void> {
    try {
      const result = await this.fashionService.getTiposFazedores();
      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getEstatisticasFazedor(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const result = await this.fashionService.getEstatisticasFazedor(req.usuarioId);
      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async criarModelo(req: AuthRequest, res: Response): Promise<void> {
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

      res.status(501).json({ error: 'Funcionalidade em desenvolvimento' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listarModelos(req: Request, res: Response): Promise<void> {
    try {

      res.status(501).json({ error: 'Funcionalidade em desenvolvimento' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  private handleError(error: any, res: Response): void {
    logger.error('Erro no FashionController:', error);

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
