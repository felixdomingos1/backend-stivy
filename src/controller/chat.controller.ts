import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth.middleware';
import { ChatRepository } from '../repositories/chat.repository';
import { NotificacaoRepository } from '../repositories/notificacao.repository';
import { ChatService } from '../services/chat.service';
import { cloudinaryService } from '../services/cloudinary.service';
import { sendDomainError } from '../services/authorization.service';
import logger from '../utils/logger';

export class ChatController {
  private chatService: ChatService;

  constructor() {
    const chatRepository = new ChatRepository();
    const notificacaoRepository = new NotificacaoRepository();
    this.chatService = new ChatService(chatRepository, notificacaoRepository);
  }

  async listarConversas(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const conversas = await this.chatService.listarConversas(req.usuarioId);

      res.status(200).json({
        success: true,
        data: conversas,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async criarConversa(req: AuthRequest, res: Response): Promise<void> {
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

      const { tipo, titulo, participantes } = req.body;

      const conversa = await this.chatService.criarConversa(
        { tipo: tipo || 'direct', titulo, participantes },
        req.usuarioId
      );

      res.status(conversa.reutilizada ? 200 : 201).json({
        success: true,
        data: conversa,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async buscarConversa(req: AuthRequest, res: Response): Promise<void> {
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
      const conversa = await this.chatService.buscarConversa(id, req.usuarioId);

      res.status(200).json({
        success: true,
        data: conversa,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async apagarMensagem(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const mensagem = await this.chatService.apagarMensagem(id, req.usuarioId);
      res.json({ success: true, data: mensagem });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async reagirMensagem(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const mensagem = await this.chatService.reagirMensagem(id, req.usuarioId, req.body?.emoji);
      res.json({ success: true, data: mensagem });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async enviarMensagem(req: AuthRequest, res: Response): Promise<void> {
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
      const { conteudo, tipo, id_resposta } = req.body;

      let midiaUrl: string | null = null;
      if (req.file) {
        // Verifica participação antes de gastar upload
        await this.chatService.buscarConversa(id, req.usuarioId);
        const upload = await cloudinaryService.uploadBuffer(req.file.buffer, {
          folder: `chat/${id}`,
          quality: 85,
          width: 1600,
          height: 1600,
        });
        midiaUrl = upload.secure_url;
      }

      const mensagem = await this.chatService.enviarMensagem(
        id,
        req.usuarioId,
        conteudo,
        midiaUrl ? 'imagem' : (tipo || 'texto'),
        midiaUrl,
        typeof id_resposta === 'string' && id_resposta ? id_resposta : null
      );

      res.status(201).json({
        success: true,
        data: mensagem,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listarMensagens(req: AuthRequest, res: Response): Promise<void> {
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
      const limit = req.query.limit ? Number(req.query.limit) : 30;
      let before: Date | undefined;
      if (req.query.before) {
        before = new Date(String(req.query.before));
        if (isNaN(before.getTime())) {
          res.status(400).json({ success: false, error: 'Parâmetro before inválido (use ISO 8601)' });
          return;
        }
      }

      const result = await this.chatService.listarMensagens(
        id,
        req.usuarioId,
        limit,
        before
      );

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async marcarMensagemComoLida(req: AuthRequest, res: Response): Promise<void> {
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
      const mensagem = await this.chatService.marcarMensagemComoLida(id, req.usuarioId);

      res.status(200).json({
        success: true,
        data: mensagem,
        message: 'Mensagem marcada como lida',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async marcarTudoComoLido(req: AuthRequest, res: Response): Promise<void> {
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
      const result = await this.chatService.marcarTudoComoLido(id, req.usuarioId);

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const result = await this.chatService.getUnreadCount(req.usuarioId);

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async deletarConversa(req: AuthRequest, res: Response): Promise<void> {
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
      const result = await this.chatService.deletarConversa(id, req.usuarioId);

      res.status(200).json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listarContatos(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const contatos = await this.chatService.listarContatos(req.usuarioId, q);
      res.status(200).json({ success: true, data: contatos });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  private handleError(error: any, res: Response): void {
    logger.error('Erro no ChatController:', error);
    sendDomainError(error, res, 'CHAT_CONTROLLER');
  }
}
