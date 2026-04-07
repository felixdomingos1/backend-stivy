import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/user.repository';
import { FazedorRepository } from '../repositories/fazedor.repository';
import { RegisterUserDto, LoginDto, PasswordResetRequestDto, PasswordResetDto } from '../dtos/auth.dto';
import { AuthRequest } from '../middleware/auth.middleware';
import logger from '../utils/logger';
import { AuthenticationError, ValidationError } from '../utils/errors';

export class AuthController {
  private authService: AuthService;

  constructor() {
    const userRepository = new UserRepository();
    const fazedorRepository = new FazedorRepository();
    this.authService = new AuthService(userRepository, fazedorRepository);
  }

  async registrar(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const dto: RegisterUserDto = req.body;
      const result = await this.authService.register(dto);

      res.status(201).json(result);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const dto: LoginDto = req.body;
      const result = await this.authService.login(dto);

      res.json(result);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async me(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const profile = await this.authService.getUserProfile(req.usuarioId);
      res.json(profile);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async recuperarSenha(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email } = req.body as PasswordResetRequestDto;
      const resetToken = await this.authService.requestPasswordReset(email);

      // Em produção, não retornar o token diretamente
      res.json({
        success: true,
        message: 'Token de recuperação gerado',
        resetToken // Apenas para desenvolvimento
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async redefinirSenha(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { token, nova_senha } = req.body as PasswordResetDto;
      await this.authService.resetPassword(token, nova_senha);

      res.json({
        success: true,
        message: 'Senha redefinida com sucesso'
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  private handleError(error: any, res: Response): void {
    logger.error('Erro na requisição:', error);

    if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message });
    } else if (error instanceof AuthenticationError) {
      res.status(401).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}
