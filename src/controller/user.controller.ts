import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { UserService, UpdatePerfilInput } from '../services/user.service';
import { UserRepository } from '../repositories/user.repository';
import { FazedorRepository } from '../repositories/fazedor.repository';
import { UpdatePasswordDto } from '../dtos/user.dto';
import { AuthRequest } from '../middleware/auth.middleware';
import { getErrorStatus } from '../utils/errors';
import logger from '../utils/logger';
import { processUpload } from '../middleware/upload.middleware';
import { cloudinaryService } from '../services/cloudinary.service';

export class UserController {
  private userService: UserService;

  constructor() {
    const userRepository = new UserRepository();
    const fazedorRepository = new FazedorRepository();
    this.userService = new UserService(userRepository, fazedorRepository);
  }

  async getPerfil(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ success: false, error: 'Não autorizado' });
        return;
      }

      const profile = await this.userService.getProfile(req.usuarioId);
      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /** GET /users/todos — apenas admin (verificarAdmin em user.routes). Paginado (limit máx. 100). */
  async pegarTodos(req: AuthRequest, res: Response): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const result = await this.userService.pegarTodos(page, limit);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async atualizarPerfil(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: errors.array()[0]?.msg || 'Erro de validação', errors: errors.array() });
        return;
      }

      if (!req.usuarioId) {
        res.status(401).json({ success: false, error: 'Não autorizado' });
        return;
      }

      const dto: UpdatePerfilInput = req.body ?? {};
      const updatedUser = await this.userService.updateProfile(req.usuarioId, dto);

      res.json({
        success: true,
        message: 'Perfil atualizado com sucesso',
        data: updatedUser
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }


  async adicionarFavorito(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: errors.array()[0]?.msg || 'Erro de validação', errors: errors.array() });
        return;
      }

      if (!req.usuarioId) {
        res.status(401).json({ success: false, error: 'Não autorizado' });
        return;
      }

      const { id_fazedor } = req.params;
      if (!id_fazedor || typeof id_fazedor != 'string') {
        res.status(400).json({ success: false, error: 'ID do fazedor é obrigatório' });
        return;
      }

      await this.userService.addFavorito(req.usuarioId, id_fazedor);

      res.status(201).json({
        success: true,
        message: 'Fazedor adicionado aos favoritos'
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async logout(_req: AuthRequest, res: Response): Promise<void> {
    try {
      res.json({
        success: true,
        message: 'Logout realizado com sucesso',
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async removerFavorito(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ success: false, error: 'Não autorizado' });
        return;
      }

      const { id_fazedor } = req.params;
      if (!id_fazedor || typeof id_fazedor != 'string') {
        res.status(400).json({ success: false, error: 'ID do fazedor é obrigatório' });
        return;
      }

      await this.userService.removeFavorito(req.usuarioId, id_fazedor);

      res.json({
        success: true,
        message: 'Fazedor removido dos favoritos'
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getMeusServicos(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ success: false, error: 'Não autorizado' });
        return;
      }

      const fazedor = await this.userService.getFazedorByUserId(req.usuarioId);

      if (!fazedor) {
        res.json({
          success: true,
          data: [],
          message: 'Usuário não é um fazedor'
        });
        return;
      }

      const servicos = await this.userService.getMeusServicos(fazedor.id_fazedor);

      res.json({
        success: true,
        data: servicos
      });
    } catch (error) {
      logger.error('Erro em getMeusServicos:', error);
      res.json({
        success: true,
        data: [],
        message: 'Erro ao carregar serviços'
      });
    }
  }


  async atualizarSenha(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: errors.array()[0]?.msg || 'Erro de validação', errors: errors.array() });
        return;
      }

      if (!req.usuarioId) {
        res.status(401).json({ success: false, error: 'Não autorizado' });
        return;
      }

      const dto: UpdatePasswordDto = req.body;
      await this.userService.updatePassword(req.usuarioId, dto);

      res.json({
        success: true,
        message: 'Senha atualizada com sucesso'
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async eliminarConta(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ success: false, error: 'Não autorizado' });
        return;
      }
      await this.userService.eliminarConta(req.usuarioId, req.body?.senha);
      res.json({ success: true, message: 'Conta eliminada com sucesso' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async atualizarFotoPerfil(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ success: false, error: 'Não autorizado' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ success: false, error: 'Nenhuma imagem enviada' });
        return;
      }

      const uploadResult = await processUpload(req.file, 'perfil', {
        width: 500,
        height: 500,
        quality: 90
      });

      if (!uploadResult) {
        res.status(400).json({ success: false, error: 'Erro ao fazer upload da imagem' });
        return;
      }

      const publicIdAntigo = await this.userService.getFotoPerfilPublicId(req.usuarioId);
      if (publicIdAntigo && publicIdAntigo !== uploadResult.public_id) {
        await cloudinaryService.deleteFile(publicIdAntigo).catch((err: any) =>
          logger.warn(`Falha ao apagar foto antiga: ${err?.message}`)
        );
      }

      const result = await this.userService.updateFotoPerfil(
        req.usuarioId,
        uploadResult.url,
        uploadResult.public_id
      );

      res.json({
        success: true,
        message: 'Foto de perfil atualizada com sucesso',
        data: {
          foto_perfil_url: result.foto_perfil_url,
          foto_perfil_public_id: result.foto_perfil_public_id
        }
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listarFavoritos(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ success: false, error: 'Não autorizado' });
        return;
      }

      const favoritos = await this.userService.listFavoritos(req.usuarioId);

      res.json({
        success: true,
        count: favoritos.length,
        data: favoritos
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }


  async seguirUsuario(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ success: false, error: 'Não autorizado' });
        return;
      }

      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, error: 'ID do usuário é obrigatório' });
        return;
      }

      await this.userService.followUser(req.usuarioId, id as string);

      res.json({
        success: true,
        message: 'Agora segues este usuário',
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async deixarSeguirUsuario(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ success: false, error: 'Não autorizado' });
        return;
      }

      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, error: 'ID do usuário é obrigatório' });
        return;
      }

      await this.userService.unfollowUser(req.usuarioId, id as string);

      res.json({
        success: true,
        message: 'Deixaste de seguir este usuário',
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getMeusSeguidores(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ success: false, error: 'Não autorizado' });
        return;
      }

      const seguidores = await this.userService.getMySeguidores(req.usuarioId);

      res.json({
        success: true,
        count: seguidores.length,
        data: seguidores,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getQuemSigo(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ success: false, error: 'Não autorizado' });
        return;
      }

      const seguindo = await this.userService.getMySeguindo(req.usuarioId);

      res.json({
        success: true,
        count: seguindo.length,
        data: seguindo,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getUserSeguidores(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, error: 'ID do usuário é obrigatório' });
        return;
      }

      const seguidores = await this.userService.getUserSeguidores(id as string);

      res.json({
        success: true,
        count: seguidores.length,
        data: seguidores,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getEstatisticas(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ success: false, error: 'Não autorizado' });
        return;
      }

      const estatisticas = await this.userService.getEstatisticas(req.usuarioId);

      res.json({
        success: true,
        data: estatisticas
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async verificarSeguindo(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ success: false, error: 'Não autorizado' });
        return;
      }

      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, error: 'ID do usuário é obrigatório' });
        return;
      }

      const seguindo = await this.userService.verificarSeguindo(req.usuarioId, id as string);

      res.json({
        success: true,
        data: { seguindo }
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async contarSeguidores(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, error: 'ID do usuário é obrigatório' });
        return;
      }

      const seguidores = await this.userService.contarSeguidores(id as string);

      res.json({
        success: true,
        data: { seguidores }
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async contarSeguindo(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, error: 'ID do usuário é obrigatório' });
        return;
      }

      const seguindo = await this.userService.contarSeguindo(id as string);

      res.json({
        success: true,
        data: { seguindo }
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  private handleError(error: any, res: Response): void {
    const status = getErrorStatus(error);
    if (status) {
      res.status(status).json({ success: false, error: error.message });
      return;
    }

    logger.error('Erro na requisição do usuário:', error);

    if (error?.code === 'P2002') {
      res.status(409).json({ success: false, error: 'Registro duplicado' });
    } else if (error?.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Registro não encontrado' });
    } else {
      const message = process.env.NODE_ENV === 'development'
        ? error.message
        : 'Erro interno do servidor';

      res.status(500).json({
        success: false,
        error: message
      });
    }
  }
}
