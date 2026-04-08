import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/user.repository';
import { FazedorRepository } from '../repositories/fazedor.repository';
import {
  RegisterUserDto,
  LoginDto,
  PasswordResetRequestDto,
  PasswordResetDto,
  VerifyEmailDto,
  ResendOTPDto,
  RequestPasswordResetDto
} from '../dtos/auth.dto';
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


  async verificarEmail(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const { userId, codigo } = req.body as VerifyEmailDto;
      const result = await this.authService.verifyEmail({ userId, codigo });
      res.json(result);
    } catch (error) {
      this.handleError(error, res);
    }
  }


  async reenviarOTP(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { userId } = req.body as ResendOTPDto;
      const result = await this.authService.resendVerificationCode(userId);
      res.json(result);
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

      const { email } = req.body as RequestPasswordResetDto;
      const result = await this.authService.requestPasswordReset(email);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async verificarCodigoRecuperacao(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, codigo } = req.body;
      const result = await this.authService.verifyPasswordResetOTP({ email, codigo });

      res.json(result);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async redefinirSenhaComOTP(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, codigo, nova_senha } = req.body;
      const result = await this.authService.resetPasswordWithOTP({ email, codigo, nova_senha });

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async logout(req: AuthRequest, res: Response): Promise<void> {
    try {
      res.json({
        success: true,
        message: 'Logout realizado com sucesso'
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }


  private handleError(error: any, res: Response): void {
    logger.error('Erro na requisição:', error);

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
    } else if (error.code === 'P2002') {
      res.status(400).json({
        success: false,
        error: 'Este email já está cadastrado'
      });
    } else if (error.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: 'Registro não encontrado'
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
