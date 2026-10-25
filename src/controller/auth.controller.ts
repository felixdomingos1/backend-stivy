import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/user.repository';
import { FazedorRepository } from '../repositories/fazedor.repository';
import {
  RegisterUserDto,
  LoginDto,
  VerifyEmailDto,
  ResendOTPDto,
  RequestPasswordResetDto
} from '../dtos/auth.dto';
import { AuthRequest } from '../middleware/auth.middleware';
import logger from '../utils/logger';
import { getErrorStatus } from '../utils/errors';
import { generateAccessToken, rotateRefreshToken, revokeAllUserTokens, RefreshTokenInvalidoError } from '../utils/jwt';

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
        res.status(400).json({ success: false, error: errors.array()[0]?.msg || 'Erro de validação', errors: errors.array() });
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
        res.status(400).json({ success: false, error: errors.array()[0]?.msg || 'Erro de validação', errors: errors.array() });
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
        res.status(400).json({ success: false, error: errors.array()[0]?.msg || 'Erro de validação', errors: errors.array() });
        return;
      }

      const { email } = req.body as ResendOTPDto;
      const result = await this.authService.resendVerificationCode(email);
      res.json(result);
    } catch (error) {
      this.handleError(error, res);
    }
  }


  async login(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: errors.array()[0]?.msg || 'Erro de validação', errors: errors.array() });
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
        res.status(401).json({ success: false, error: 'Não autorizado' });
        return;
      }

      const profile = await this.authService.getUserProfile(req.usuarioId);
      // Mantém `usuario`/`fazedor` no topo (compatibilidade) e também em `data` (envelope padrão)
      res.json({ success: true, ...profile, data: profile });
    } catch (error) {
      this.handleError(error, res);
    }
  }


  async recuperarSenha(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: errors.array()[0]?.msg || 'Erro de validação', errors: errors.array() });
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
        res.status(400).json({ success: false, error: errors.array()[0]?.msg || 'Erro de validação', errors: errors.array() });
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
        res.status(400).json({ success: false, error: errors.array()[0]?.msg || 'Erro de validação', errors: errors.array() });
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

  /**
   * POST /auth/refresh-token { refreshToken } -> { success, token, refreshToken, data: { token, refreshToken } }
   * Rotação: o refresh token apresentado é revogado ANTES de emitir o novo; reutilização de um token
   * revogado revoga todas as sessões do utilizador.
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body ?? {};

      if (!refreshToken || typeof refreshToken !== 'string') {
        res.status(400).json({ success: false, error: 'Refresh token é obrigatório' });
        return;
      }

      const { id_usuario, refreshToken: newRefreshToken } = await rotateRefreshToken(refreshToken);
      const user = await new UserRepository().findById(id_usuario);

      if (!user || user.status !== 'ativo') {
        await revokeAllUserTokens(id_usuario);
        res.status(401).json({ success: false, error: 'Não autorizado' });
        return;
      }

      const newAccessToken = generateAccessToken({
        id: user.id_usuario,
        email: user.email,
        tipo: user.tipo,
        isVerified: user.email_verificado,
      });

      res.json({
        success: true,
        token: newAccessToken,
        refreshToken: newRefreshToken,
        data: { token: newAccessToken, refreshToken: newRefreshToken },
      });
    } catch (error) {
      if (error instanceof RefreshTokenInvalidoError) {
        res.status(401).json({ success: false, error: error.message });
        return;
      }
      this.handleError(error, res);
    }
  }

  async logout(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.usuarioId) {
        await revokeAllUserTokens(req.usuarioId);
      }

      res.json({
        success: true,
        message: 'Logout realizado com sucesso'
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

    logger.error('Erro na requisição:', error);

    if (error?.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: 'Este email já está cadastrado'
      });
    } else if (error?.code === 'P2025') {
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
