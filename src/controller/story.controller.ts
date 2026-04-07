import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { StoryRepository } from '../repositories/story.repository';
import { cloudinaryService } from '../services/cloudinary.service';
import { ValidationError, NotFoundError } from '../utils/errors';
import logger from '../utils/logger';

export class StoryController {
  private storyRepository: StoryRepository;

  constructor() {
    this.storyRepository = new StoryRepository();
  }

  async criarStory(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'Nenhuma mídia enviada' });
        return;
      }

      const { texto, cor_fundo, duracao = 5 } = req.body;
      const tipo = req.file.mimetype.startsWith('video/') ? 'video' : 'imagem';

      const uploadResult = await cloudinaryService.uploadBuffer(req.file.buffer, {
        folder: `stories/${req.usuarioId}`,
        resource_type: tipo as any,
        quality: 90
      });

      // Expira em 24 horas
      const expira_em = new Date();
      expira_em.setHours(expira_em.getHours() + 24);

      const story = await this.storyRepository.create({
        id_usuario: req.usuarioId,
        midia_url: uploadResult.secure_url,
        midia_public_id: uploadResult.public_id,
        tipo,
        duracao: Number(duracao),
        texto,
        cor_fundo,
        expira_em
      });

      // Agendar deleção automática após 24h (opcional: usar cron job)
      this.scheduleStoryDeletion(story.id_story, expira_em);

      res.status(201).json({
        success: true,
        data: story,
        message: 'Story publicado com sucesso! Expira em 24 horas.'
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listarStories(req: AuthRequest, res: Response): Promise<void> {
    try {
      const stories = await this.storyRepository.findActiveStories(50);

      // Marcar visualizações do usuário atual
      if (req.usuarioId) {
        for (const story of stories) {
          const jaVisualizou = story.visualizacoes.some(
            (v: any) => v.id_usuario === req.usuarioId
          );
          story['ja_visualizou'] = jaVisualizou;

          const jaCurtiu = story.curtidas.some(
            (c: any) => c.id_usuario === req.usuarioId
          );
          story['ja_curtiu'] = jaCurtiu;
        }
      }

      // Agrupar por usuário
      const storiesByUser = stories.reduce((acc: any, story: any) => {
        const userId = story.id_usuario;
        if (!acc[userId]) {
          acc[userId] = {
            usuario: story.usuario,
            stories: []
          };
        }
        acc[userId].stories.push(story);
        return acc;
      }, {});

      res.json({
        success: true,
        data: Object.values(storiesByUser)
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async visualizarStory(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await this.storyRepository.addVisualizacao(id, req.usuarioId);
      res.json({
        success: true,
        message: 'Story marcado como visualizado'
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async curtirStory(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await this.storyRepository.addCurtida(id, req.usuarioId);
      res.json({
        success: true,
        message: 'Story curtido!'
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async descurtirStory(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await this.storyRepository.removeCurtida(id, req.usuarioId);

      res.json({
        success: true,
        message: 'Curtida removida'
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async meusStories(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const stories = await this.storyRepository.findActiveByUsuario(req.usuarioId);

      res.json({
        success: true,
        data: stories
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async deletarStory(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const story = await this.storyRepository.findById(id);
      if (!story) {
        throw new NotFoundError('Story não encontrado');
      }

      if (story.id_usuario !== req.usuarioId) {
        res.status(403).json({ error: 'Você não pode deletar este story' });
        return;
      }

      await cloudinaryService.deleteFile(story.midia_public_id);
      await this.storyRepository.delete(id);
      res.json({
        success: true,
        message: 'Story deletado com sucesso'
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  private scheduleStoryDeletion(storyId: string, expiresAt: Date): void {
    const now = new Date();
    const delay = expiresAt.getTime() - now.getTime();

    if (delay > 0) {
      setTimeout(async () => {
        try {
          await this.storyRepository.delete(storyId);
          logger.info(`Story ${storyId} deletado automaticamente após expiração`);
        } catch (error) {
          logger.error(`Erro ao deletar story expirado ${storyId}:`, error);
        }
      }, delay);
    }
  }

  private handleError(error: any, res: Response): void {
    logger.error('Erro no StoryController:', error);

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
