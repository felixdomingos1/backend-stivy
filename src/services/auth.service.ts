import { IAuthService } from '../interfaces/IAuthService';
import { RegisterUserDto, LoginDto, AuthResponseDto, VerifyEmailDto, RequestPasswordResetDto, VerifyPasswordResetOtpDto, ResetPasswordWithOtpDto } from '../dtos/auth.dto';
import { UserRepository } from '../repositories/user.repository';
import { FazedorRepository } from '../repositories/fazedor.repository';
import { hashSenha, compararSenha } from '../utils/bcrypt';
import { gerarToken } from '../utils/jwt';
import logger from '../utils/logger';
import { ValidationError, AuthenticationError, AuthorizationError } from '../utils/errors';
import { EmailService } from './email.service';
import { OTPService } from './otp.service';

export class AuthService implements IAuthService {
  private emailService: EmailService;
  private otpService: OTPService;

  constructor(
    private userRepository: UserRepository,
    private fazedorRepository: FazedorRepository
  ) {
    this.emailService = EmailService.getInstance();
    this.otpService = OTPService.getInstance();
  }

  async register(dto: RegisterUserDto): Promise<AuthResponseDto> {
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ValidationError('Email já cadastrado');
    }

    if (dto.tipo === 'fazedor') {
      if (!dto.tipo_fazedor) {
        throw new AuthorizationError('Precisas enviar o tipo de fazedor')
      }

    }

    const hashedPassword = await hashSenha(dto.senha);
    const otpCode = this.otpService.generateOTP();
    const otpExpiration = this.otpService.getExpirationDate();

    const user = await this.userRepository.create({
      nome: dto.nome,
      email: dto.email,
      senha_hash: hashedPassword,
      telefone: dto.telefone,
      tipo: dto.tipo,
      status: 'ativo',
      email_verificado: false,
      email_verification_code: otpCode,
      email_verification_expira: otpExpiration,
      verification_attempts: 0
    });

    let fazedor = null;

    if (dto.tipo === 'fazedor' && dto.tipo_fazedor) {
      fazedor = await this.fazedorRepository.createFazedor({
        id_usuario: user.id_usuario,
        tipo_fazedor: dto.tipo_fazedor
      });
    }

    try {
      await this.emailService.sendVerificationEmail(dto.email, dto.nome, otpCode);
      logger.info(`Email de verificação enviado para: ${dto.email}`);
    } catch (error) {
      logger.error('Falha ao enviar email de verificação:', error);
    }

    const tempToken = gerarToken({
      id: user.id_usuario,
      email: user.email,
      tipo: user.tipo,
      isVerified: false
    }, '1h');

    return {
      success: true,
      message: 'Usuário cadastrado com sucesso! Verifique seu email para ativar sua conta.',
      token: tempToken,
      requiresVerification: true,
      usuario: {
        id: user.id_usuario,
        nome: user.nome,
        email: user.email,
        telefone: user.telefone || undefined,
        tipo: user.tipo,
        foto_perfil: user.foto_perfil || undefined,
        email_verificado: false,
        status_aprovacao: fazedor?.status_aprovacao || undefined,
        tipo_fazedor: fazedor?.tipo_fazedor || undefined
      }
    };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<AuthResponseDto> {
    const user = await this.userRepository.findById(dto.userId);
    if (!user) {
      throw new ValidationError('Usuário não encontrado');
    }

    if (user.email_verificado) {
      throw new ValidationError('Email já verificado');
    }

    const maxAttempts = 5;
    const attempts = user.verification_attempts || 0;

    if (attempts >= maxAttempts) {
      throw new ValidationError('Número máximo de tentativas excedido. Solicite um novo código.');
    }

    const isValid = this.otpService.isOTPValid(
      dto.codigo,
      user.email_verification_code,
      user.email_verification_expira
    );

    if (!isValid) {
      await this.userRepository.incrementVerificationAttempts(user.id_usuario);
      const remainingAttempts = maxAttempts - (attempts + 1);
      throw new ValidationError(`Código inválido ou expirado. Você tem ${remainingAttempts} tentativa(s) restante(s).`);
    }

    await this.userRepository.markEmailAsVerified(user.id_usuario);

    try {
      await this.emailService.sendWelcomeEmail(user.email, user.nome);
    } catch (error) {
      logger.warn('Falha ao enviar email de boas-vindas:', error);
    }

    const token = gerarToken({
      id: user.id_usuario,
      email: user.email,
      tipo: user.tipo,
      isVerified: true
    });

    logger.info(`Email verificado para usuário: ${user.email}`);

    const fazedor = await this.fazedorRepository.findFazedorByUserId(user.id_usuario);

    return {
      success: true,
      message: 'Email verificado com sucesso! Sua conta está ativa.',
      token,
      usuario: {
        id: user.id_usuario,
        nome: user.nome,
        email: user.email,
        telefone: user.telefone || undefined,
        tipo: user.tipo,
        foto_perfil: user.foto_perfil || undefined,
        email_verificado: true,
        status_aprovacao: fazedor?.status_aprovacao || undefined,
        tipo_fazedor: fazedor?.tipo_fazedor || undefined
      }
    };
  }

  async resendVerificationCode(email: string): Promise<{ message: string }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new ValidationError('Usuário não encontrado');
    }

    if (user.email_verificado) {
      throw new ValidationError('Email já verificado');
    }

    const newOTP = this.otpService.generateOTP();
    const newExpiration = this.otpService.getExpirationDate();

    await this.userRepository.updateVerificationCode(user.id_usuario, newOTP, newExpiration);

    try {
      await this.emailService.sendVerificationEmail(user.email, user.nome, newOTP);
      logger.info(`Novo código de verificação enviado para: ${user.email}`);
    } catch (error) {
      logger.error('Falha ao reenviar email de verificação:', error);
      throw new Error('Falha ao enviar email. Tente novamente.');
    }

    return {
      message: 'Novo código de verificação enviado com sucesso!'
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new AuthenticationError('Email ou senha inválidos');
    }

    const isValidPassword = await compararSenha(dto.senha, user.senha_hash);
    if (!isValidPassword) {
      throw new AuthenticationError('Email ou senha inválidos');
    }

    if (user.status !== 'ativo') {
      throw new AuthenticationError('Usuário bloqueado ou inativo');
    }

    // if (!user.email_verificado) {
    //   throw new AuthenticationError('Email não verificado. Verifique sua caixa de entrada.');
    // }

    await this.userRepository.updateLastAccess(user.id_usuario);

    const fazedor = await this.fazedorRepository.findFazedorByUserId(user.id_usuario);

    const token = gerarToken({
      id: user.id_usuario,
      email: user.email,
      tipo: user.tipo,
      isVerified: true
    });

    logger.info(`Usuário logado: ${user.email}`);

    return {
      success: true,
      message: 'Login realizado com sucesso',
      token,
      usuario: {
        id: user.id_usuario,
        nome: user.nome,
        email: user.email,
        telefone: user.telefone || undefined,
        tipo: user.tipo,
        foto_perfil: user.foto_perfil || undefined,
        email_verificado: true,
        status_aprovacao: fazedor?.status_aprovacao || undefined,
        tipo_fazedor: fazedor?.tipo_fazedor || undefined
      }
    };
  }

  async getUserProfile(userId: string): Promise<any> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ValidationError('Usuário não encontrado');
    }

    const fazedor = await this.fazedorRepository.findFazedorWithDetails(userId);

    return { usuario: user, fazedor };
  }

  async requestPasswordReset(email: string): Promise<{ message: string}> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new ValidationError('Email não encontrado');
    }
    const otpCode = this.otpService.generateOTP();
    const otpExpiration = this.otpService.getExpirationDate();
    await this.userRepository.updatePasswordResetOTP(email, otpCode, otpExpiration);
    try {
      await this.emailService.sendPasswordResetOTPEmail(user.email, user.nome, otpCode);
      logger.info(`Email de recuperação com OTP enviado para: ${email}`);
    } catch (error) {
      logger.error('Falha ao enviar email de recuperação:', error);
      throw new Error('Falha ao enviar email de recuperação');
    }

    return {
      message: 'Código de verificação enviado para seu email!'
    };
  }

  async verifyPasswordResetOTP(dto: VerifyPasswordResetOtpDto): Promise<{ isValid: boolean; message: string }> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new ValidationError('Email não encontrado');
    }

    const maxAttempts = 3;
    const attempts = user.reset_password_attempts || 0;

    if (attempts >= maxAttempts) {
      throw new ValidationError('Número máximo de tentativas excedido. Solicite um novo código.');
    }

    const isValid = this.otpService.isOTPValid(
      dto.codigo,
      user.reset_password_code,
      user.reset_password_expira
    );

    if (!isValid) {
      await this.userRepository.incrementResetPasswordAttempts(dto.email);
      const remainingAttempts = maxAttempts - (attempts + 1);
      throw new ValidationError(`Código inválido ou expirado. Você tem ${remainingAttempts} tentativa(s) restante(s).`);
    }

    logger.info(`OTP de recuperação verificado para: ${dto.email}`);

    return {
      isValid: true,
      message: 'Código verificado com sucesso! Agora você pode redefinir sua senha.'
    };
  }

  async resetPasswordWithOTP(dto: ResetPasswordWithOtpDto): Promise<{ message: string }> {
    const user = await this.userRepository.findByPasswordResetOTP(dto.email, dto.codigo);

    if (!user) {
      throw new ValidationError('Código inválido ou expirado. Solicite um novo código.');
    }

    const hashedPassword = await hashSenha(dto.nova_senha);

    await this.userRepository.updatePassword(user.id_usuario, hashedPassword);
    await this.userRepository.clearPasswordResetOTP(dto.email);

    logger.info(`Senha redefinida com OTP para usuário: ${user.email}`);

    return {
      message: 'Senha redefinida com sucesso! Faça login com sua nova senha.'
    };
  }
}
