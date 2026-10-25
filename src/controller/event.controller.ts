import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { validationResult } from 'express-validator';
import { EventService } from '../services/event.service';
import { EventoRepository } from '../repositories/evento.repository';
import { FazedorRepository } from '../repositories/fazedor.repository';
import { NotificacaoRepository } from '../repositories/notificacao.repository';
import { CreateEventoDto, UpdateEventoDto } from '../dtos/event.dto';
import { processMultipleUploads, processUpload } from '../middleware/upload.middleware';
import logger from '../utils/logger';
import { sendDomainError, parseGeoQuery } from '../services/authorization.service';

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
        logger.warn('[EVENT_CONTROLLER] Validacao falhou:', errors.array());
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      // Allowlist de campos (nunca confiar em id_organizador/imagens vindos do body)
      const { titulo, descricao, local, latitude, longitude, data_inicio, data_fim, tipo_evento, valor_ingresso } = req.body;
      const dto: CreateEventoDto = { titulo, descricao, local, latitude, longitude, data_inicio, data_fim, tipo_evento, valor_ingresso };

      // ✅ Upload das imagens do evento (se enviadas)
      let imagens: Array<{
        imagem_url: string;
        imagem_public_id: string;
        ordem: number;
      }> = [];
      const filesField = req.files as Record<string, Express.Multer.File[]> | Express.Multer.File[] | undefined;
      const fotos: Express.Multer.File[] = Array.isArray(filesField) ? filesField : (filesField?.fotos ?? []);
      const bannerFile: Express.Multer.File | undefined = Array.isArray(filesField) ? undefined : filesField?.banner?.[0];

      if (fotos.length > 0) {
        const uploads = await processMultipleUploads(fotos, 'eventos');
        imagens = uploads
          .filter((u): u is { public_id: string; url: string; thumbnail: string } => u !== null)
          .map((u, index) => ({
            imagem_url: u.url,
            imagem_public_id: u.public_id,
            ordem: index
          }));
      }

      if (bannerFile) {
        const banner = await processUpload(bannerFile, 'eventos/banners', { width: 1600, quality: 85 });
        if (banner) {
          dto.banner_url = banner.url;
          dto.banner_public_id = banner.public_id;
          if (imagens.length === 0) {
            imagens = [{ imagem_url: banner.url, imagem_public_id: banner.public_id, ordem: 0 }];
          }
        }
      }

      dto.imagens = imagens;

      const result = await this.eventService.createEvento(req.usuarioId, dto);

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      logger.error('[EVENT_CONTROLLER] ERRO em criarEvento:', error);
      this.handleError(error, res);
    }
  }

  async buscarEventoPorId(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await this.eventService.getEventoById(id, req.usuarioId);

      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listarEventos(req: AuthRequest, res: Response): Promise<void> {
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

      const pageNum = Math.max(Number(page) || 1, 1);
      const limitNum = Math.min(Math.max(Number(limit) || 20, 1), 100);
      const result = await this.eventService.listEventos(
        { ...filters, proximos: req.query.proximos === 'true' || (req.query.proximos as any) === true },
        pageNum,
        limitNum,
        req.usuarioId
      );

      res.json({
        success: true,
        data: result.data,
        pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages }
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listarEventosProximos(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { lat, lng, raio } = parseGeoQuery(req.query, 50);
      const limit = Number(req.query.limit) || 50;
      const result = await this.eventService.listEventosProximos({ lat, lng, raio, limit }, req.usuarioId);

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
      const { titulo, descricao, local, latitude, longitude, data_inicio, data_fim, tipo_evento, valor_ingresso, status } = req.body;
      const dto: UpdateEventoDto = { titulo, descricao, local, latitude, longitude, data_inicio, data_fim, tipo_evento, valor_ingresso, status };
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

  async listarParticipantes(req: AuthRequest, res: Response): Promise<void> {
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
        Math.max(Number(page) || 1, 1),
        Math.min(Math.max(Number(limit) || 20, 1), 100),
        req.usuarioId
      );

      res.json({
        success: true,
        data: result.data,
        sou_organizador: result.sou_organizador,
        pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages }
      });
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
    sendDomainError(error, res, 'EVENT_CONTROLLER');
  }
}
