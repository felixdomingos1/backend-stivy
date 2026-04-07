// services/auth.service.ts
import { IAuthService } from '../interfaces/IAuthService';
import { RegisterUserDto, LoginDto, AuthResponseDto } from '../dtos/auth.dto';
import { UserRepository } from '../repositories/user.repository';
import { FazedorRepository } from '../repositories/fazedor.repository';
import { hashSenha, compararSenha } from '../utils/bcrypt';
import { gerarToken } from '../utils/jwt';
import logger from '../utils/logger';
import crypto from 'crypto';
import { ValidationError, AuthenticationError } from '../utils/errors';

export class AuthService implements IAuthService {
  constructor(
    private userRepository: UserRepository,
    private fazedorRepository: FazedorRepository
  ) { }

  async register(dto: RegisterUserDto): Promise<AuthResponseDto> {
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ValidationError('Email já cadastrado');
    }

    const hashedPassword = await hashSenha(dto.senha);

    const user = await this.userRepository.create({
      nome: dto.nome,
      email: dto.email,
      senha_hash: hashedPassword,
      telefone: dto.telefone,
      tipo: dto.tipo,
      status: 'ativo'
    });

    let fazedor = null;
    if (dto.tipo === 'fazedor' && dto.tipo_fazedor) {
      fazedor = await this.fazedorRepository.createFazedor({
        id_usuario: user.id_usuario,
        tipo_fazedor: dto.tipo_fazedor
      });
    }

    const token = gerarToken({
      id: user.id_usuario,
      email: user.email,
      tipo: user.tipo
    });

    logger.info(`Novo usuário registrado: ${user.email}`);

    return {
      success: true,
      message: 'Usuário cadastrado com sucesso',  // Adicionar message
      token,
      usuario: {
        id: user.id_usuario,
        nome: user.nome,
        email: user.email,
        telefone: user.telefone || undefined,
        tipo: user.tipo,
        foto_perfil: user.foto_perfil || undefined,
        status_aprovacao: fazedor?.status_aprovacao || undefined,
        tipo_fazedor: fazedor?.tipo_fazedor || undefined
      }
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    // Usar findByIdComplete para ter acesso à senha_hash
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

    await this.userRepository.updateLastAccess(user.id_usuario);

    const fazedor = await this.fazedorRepository.findFazedorByUserId(user.id_usuario);

    const token = gerarToken({
      id: user.id_usuario,
      email: user.email,
      tipo: user.tipo
    });

    logger.info(`Usuário logado: ${user.email}`);

    return {
      success: true,
      message: 'Login realizado com sucesso',  // Adicionar message
      token,
      usuario: {
        id: user.id_usuario,
        nome: user.nome,
        email: user.email,
        telefone: user.telefone || undefined,
        tipo: user.tipo,
        foto_perfil: user.foto_perfil || undefined,
        status_aprovacao: fazedor?.status_aprovacao || undefined,
        tipo_fazedor: fazedor?.tipo_fazedor || undefined
      }
    };
  }

  async getUserProfile(userId: number): Promise<any> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ValidationError('Usuário não encontrado');
    }

    const fazedor = await this.fazedorRepository.findFazedorWithDetails(userId);

    return { usuario: user, fazedor };
  }

  async requestPasswordReset(email: string): Promise<string> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new ValidationError('Email não encontrado');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000);

    await this.userRepository.updatePasswordResetToken(
      user.id_usuario,
      resetToken,
      resetTokenExpires
    );

    logger.info(`Token de recuperação gerado para: ${email}`);

    return resetToken;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.prisma?.usuario.findFirst({
      where: {
        reset_token: token,
        reset_token_expira: { gt: new Date() }
      }
    });

    if (!user) {
      throw new ValidationError('Token inválido ou expirado');
    }

    const hashedPassword = await hashSenha(newPassword);
    await this.userRepository.updatePassword(user.id_usuario, hashedPassword);

    logger.info(`Senha redefinida para usuário: ${user.email}`);
  }

  private get prisma() {
    return require('../config/database').default;
  }
}
