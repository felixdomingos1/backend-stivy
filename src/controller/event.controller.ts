// controllers/event.controller.ts
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { validationResult } from 'express-validator';
import { EventService } from '../services/event.service';
import { EventoRepository } from '../repositories/evento.repository';
import { FazedorRepository } from '../repositories/fazedor.repository';
import { NotificacaoRepository } from '../repositories/notificacao.repository';
import { CreateEventoDto, UpdateEventoDto } from '../dtos/event.dto';
import logger from '../utils/logger';
import { ValidationError, NotFoundError } from '../utils/errors';

export class EventController {
  private eventService: EventService;

  constructor() {
    const eventoRepository = new EventoRepository();
    const fazedorRepository = new FazedorRepository();
    const notificacaoRepository = new NotificacaoRepository();
    this.eventService = new EventService(
      eventoRepository,
      fazedorRepository,
      notificacaoRepository
    );
  }

  async criarEvento(req: AuthRequest, res: Response): Promise<void> {
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

      const dto: CreateEventoDto = req.body;
      const result = await this.eventService.createEvento(req.usuarioId, dto);

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async buscarEventoPorId(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await this.eventService.getEventoById(id);

      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listarEventos(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const {
        tipo,
        status,
        data_inicio,
        data_fim,
        search,
        page = 1,
        limit = 20
      } = req.query;

      const filters = {
        tipo: tipo as string,
        status: status as string,
        data_inicio: data_inicio ? new Date(data_inicio as string) : undefined,
        data_fim: data_fim ? new Date(data_fim as string) : undefined,
        search: search as string
      };

      const result = await this.eventService.listEventos(
        filters,
        Number(page),
        Number(limit)
      );

      res.json(result);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listarEventosProximos(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 10 } = req.query;
      const result = await this.eventService.listEventosProximos(Number(limit));

      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async atualizarEvento(req: AuthRequest, res: Response): Promise<void> {
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
      const dto: UpdateEventoDto = req.body;
      const result = await this.eventService.updateEvento(id, req.usuarioId, dto);

      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async cancelarEvento(req: AuthRequest, res: Response): Promise<void> {
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
      await this.eventService.cancelEvento(id, req.usuarioId);

      res.json({ success: true, message: 'Evento cancelado com sucesso' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async confirmarParticipacao(req: AuthRequest, res: Response): Promise<void> {
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
      await this.eventService.participarEvento(id, req.usuarioId);

      res.json({ success: true, message: 'Participação confirmada com sucesso' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async cancelarParticipacao(req: AuthRequest, res: Response): Promise<void> {
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
      await this.eventService.cancelarParticipacao(id, req.usuarioId);

      res.json({ success: true, message: 'Participação cancelada com sucesso' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listarParticipantes(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { page = 1, limit = 20 } = req.query;

      const result = await this.eventService.listParticipantes(
        id,
        Number(page),
        Number(limit)
      );

      res.json(result);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getMeusEventos(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const result = await this.eventService.getMeusEventos(req.usuarioId);
      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getEventosParticipando(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const result = await this.eventService.getEventosParticipando(req.usuarioId);
      res.json({ success: true, data: result });
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

      const result = await this.eventService.getEstatisticas(req.usuarioId);
      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  private handleError(error: any, res: Response): void {
    logger.error('Erro no EventController:', error);

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
