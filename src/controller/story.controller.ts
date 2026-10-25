import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { StoryRepository } from '../repositories/story.repository';
import { cloudinaryService } from '../services/cloudinary.service';
import { NotFoundError } from '../utils/errors';
import logger from '../utils/logger';
import { sendDomainError } from '../services/authorization.service';
import { NotificacaoRepository } from '../repositories/notificacao.repository';

export class StoryController {
  private storyRepository: StoryRepository;
  private notificacaoRepository: NotificacaoRepository;

  constructor() {
    this.storyRepository = new StoryRepository();
    this.notificacaoRepository = new NotificacaoRepository();
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

      const { texto, cor_fundo } = req.body;
      const tipo = req.file.mimetype.startsWith('video/') ? 'video' : 'imagem';
      const duracaoPedida = Number(req.body.duracao);
      const duracao = Number.isFinite(duracaoPedida) && duracaoPedida > 0
        ? Math.min(Math.max(Math.round(duracaoPedida), 3), 60)
        : (tipo === 'video' ? 15 : 5);

      const uploadResult = await cloudinaryService.uploadBuffer(req.file.buffer, {
        folder: `stories/${req.usuarioId}`,
        resource_type: tipo === 'video' ? 'video' : 'image',
        ...(tipo === 'imagem' && { quality: 90 })
      });

      const expira_em = new Date();
      expira_em.setHours(expira_em.getHours() + 24);

      const story = await this.storyRepository.create({
        id_usuario: req.usuarioId,
        midia_url: uploadResult.secure_url,
        midia_public_id: uploadResult.public_id,
        tipo,
        duracao,
        texto,
        cor_fundo,
        expira_em
      });

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
      const viewerId = req.usuarioId;
      const stories = await this.storyRepository.findActiveStories(100, viewerId);

      const storiesByUser = stories.reduce((acc: any, story: any) => {
        const { visualizacoes, curtidas, _count, ...rest } = story;
        const item = {
          ...rest,
          total_visualizacoes: _count?.visualizacoes ?? 0,
          total_curtidas: _count?.curtidas ?? 0,
          total_comentarios: _count?.comentarios ?? 0,
          ja_visualizou: !!viewerId && visualizacoes.length > 0,
          curti: !!viewerId && curtidas.length > 0,
          ja_curtiu: !!viewerId && curtidas.length > 0,
          sou_dono: !!viewerId && story.id_usuario === viewerId
        };
        const userId = story.id_usuario;
        if (!acc[userId]) {
          acc[userId] = {
            usuario: story.usuario,
            stories: [],
            todos_visualizados: true
          };
        }
        acc[userId].stories.push(item);
        if (!item.ja_visualizou) acc[userId].todos_visualizados = false;
        return acc;
      }, {});

      // Stories de cada utilizador em ordem cronológica (mais antigo primeiro)
      const grupos = Object.values(storiesByUser).map((g: any) => ({
        ...g,
        stories: g.stories.reverse()
      }));

      res.json({
        success: true,
        data: grupos
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listarVisualizacoes(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const story = await this.storyRepository.findViewers(id);
      if (!story) {
        throw new NotFoundError('Story não encontrado');
      }
      if (story.id_usuario !== req.usuarioId) {
        res.status(403).json({ success: false, error: 'Apenas o autor pode ver quem visualizou este story' });
        return;
      }
      res.json({
        success: true,
        data: {
          id_story: story.id_story,
          total_visualizacoes: story.visualizacoes.length,
          total_curtidas: story.curtidas.length,
          visualizacoes: story.visualizacoes,
          curtidas: story.curtidas
        }
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  private async getActiveStoryOrThrow(id: string) {
    const story = await this.storyRepository.findById(id);
    if (!story || story.expira_em < new Date()) {
      throw new NotFoundError('Story não encontrado ou expirado');
    }
    return story;
  }

  async visualizarStory(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await this.getActiveStoryOrThrow(id);
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
      const story = await this.getActiveStoryOrThrow(id);
      await this.storyRepository.addCurtida(id, req.usuarioId);
      if (story.id_usuario !== req.usuarioId) {
        await this.notificacaoRepository.createSafe({
          id_usuario: story.id_usuario,
          titulo: 'Novo gosto no seu story',
          mensagem: `${req.usuario?.nome ?? 'Alguém'} gostou do seu story.`,
          tipo: 'reacao',
          link: `/story/${id}`,
          id_ator: req.usuarioId
        });
      }
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

  async listarComentarios(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await this.getActiveStoryOrThrow(id);
      const comentarios = await this.storyRepository.findComentarios(id);
      res.json({ success: true, data: comentarios });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async comentarStory(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const story = await this.getActiveStoryOrThrow(id);
      const comentario = await this.storyRepository.addComentario(id, req.usuarioId, String(req.body.comentario).trim());
      if (story.id_usuario !== req.usuarioId) {
        await this.notificacaoRepository.createSafe({
          id_usuario: story.id_usuario,
          titulo: 'Novo comentário no seu story',
          mensagem: `${req.usuario?.nome ?? 'Alguém'} comentou: "${comentario.comentario.slice(0, 80)}"`,
          tipo: 'comentario',
          link: `/story/${id}`,
          id_ator: req.usuarioId
        });
      }
      res.status(201).json({ success: true, data: comentario });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /** Apaga um comentário: pode o autor do comentário ou o dono do story. */
  async apagarComentario(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const comentario = await this.storyRepository.findComentarioById(id);
      if (!comentario) {
        throw new NotFoundError('Comentário não encontrado');
      }
      if (comentario.id_usuario !== req.usuarioId && comentario.story.id_usuario !== req.usuarioId) {
        res.status(403).json({ success: false, error: 'Não pode apagar este comentário' });
        return;
      }
      await this.storyRepository.deleteComentario(id);
      res.json({ success: true, message: 'Comentário apagado' });
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
        data: stories.map(({ _count, ...story }: any) => ({
          ...story,
          total_visualizacoes: _count?.visualizacoes ?? 0,
          total_curtidas: _count?.curtidas ?? 0,
          total_comentarios: _count?.comentarios ?? 0,
          sou_dono: true
        }))
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

      await this.storyRepository.delete(id);
      cloudinaryService
        .deleteFile(story.midia_public_id, story.tipo === 'video' ? 'video' : 'image')
        .catch(err => logger.warn(`Falha ao apagar media do story ${id}:`, err?.message ?? err));
      res.json({
        success: true,
        message: 'Story deletado com sucesso'
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  private handleError(error: any, res: Response): void {
    logger.error('Erro no StoryController:', error);
    sendDomainError(error, res, 'STORY_CONTROLLER');
  }
}
