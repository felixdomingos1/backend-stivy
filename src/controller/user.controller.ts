import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { UserService } from '../services/user.service';
import { UserRepository } from '../repositories/user.repository';
import { FazedorRepository } from '../repositories/fazedor.repository';
import { UpdateUserDto, UpdatePasswordDto } from '../dtos/user.dto';
import { AuthRequest } from '../middleware/auth.middleware';
import { ValidationError, AuthenticationError, NotFoundError } from '../utils/errors';
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
        res.status(401).json({ error: 'Não autorizado' });
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

  async pegarTodos(req: AuthRequest, res: Response): Promise<void> {
    try {
      const users = await this.userService.pegarTodos();
      res.json({
        success: true,
        count: users.length,
        data: users
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async atualizarPerfil(req: AuthRequest, res: Response): Promise<void> {
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

      const dto: UpdateUserDto = req.body;
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

  async atualizarSenha(req: AuthRequest, res: Response): Promise<void> {
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

  async atualizarFotoPerfil(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'Nenhuma imagem enviada' });
        return;
      }

      const uploadResult = await processUpload(req.file, 'perfil', {
        width: 500,
        height: 500,
        quality: 90
      });

      if (!uploadResult) {
        res.status(400).json({ error: 'Erro ao fazer upload da imagem' });
        return;
      }
 
      const user = await this.userService.getProfile(req.usuarioId);
      if (user.foto_perfil_public_id) {
        await cloudinaryService.deleteFile(user.foto_perfil_public_id);
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
        res.status(401).json({ error: 'Não autorizado' });
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

  async adicionarFavorito(req: AuthRequest, res: Response): Promise<void> {
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

      const fazedorId = req.params.usuarioId;
      if (fazedorId) {
        res.status(400).json({ error: 'ID do fazedor inválido' });
        return;
      }

      await this.userService.addFavorito(req.usuarioId, fazedorId);

      res.status(201).json({
        success: true,
        message: 'Fazedor adicionado aos favoritos'
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async removerFavorito(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }
      const fazedorId = req.params.id_fazedor;
      if (fazedorId) {
        res.status(400).json({ error: 'ID do fazedor inválido' });
        return;
      }

      await this.userService.removeFavorito(req.usuarioId, fazedorId);

      res.json({
        success: true,
        message: 'Fazedor removido dos favoritos'
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

      const estatisticas = await this.userService.getEstatisticas(req.usuarioId);

      res.json({
        success: true,
        data: estatisticas
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Tratamento de erros centralizado
   */
  private handleError(error: any, res: Response): void {
    logger.error('Erro na requisição do usuário:', error);

    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    } else if (error instanceof AuthenticationError) {
      res.status(401).json({
        success: false,
        error: error.message
      });
    } else if (error instanceof NotFoundError) {
      res.status(404).json({
        success: false,
        error: error.message
      });
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
