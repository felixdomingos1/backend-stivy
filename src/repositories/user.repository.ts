// repositories/user.repository.ts
import { PrismaClient, Usuario, Prisma } from '@prisma/client';
import { IUserRepository } from '../interfaces/IUserRepository';
import prisma from '../config/database';

export class UserRepository implements IUserRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    return await this.prisma.usuario.findUnique({
      where: { email }
    });
  }

  async findByIdComplete(id: number): Promise<Usuario | null> {
    return await this.prisma.usuario.findUnique({
      where: { id_usuario: id }
    });
  }

  async findById(id: number): Promise<Omit<Usuario, 'senha_hash' | 'reset_token' | 'reset_token_expira'> | null> {
    return await this.prisma.usuario.findUnique({
      where: { id_usuario: id },
      select: {
        id_usuario: true,
        nome: true,
        email: true,
        telefone: true,
        tipo: true,
        foto_perfil: true,
        data_cadastro: true,
        status: true,
        ultimo_acesso: true
      }
    });
  }

  async create(data: Prisma.UsuarioCreateInput): Promise<Usuario> {
    return await this.prisma.usuario.create({ data });
  }

  async update(id: number, data: Prisma.UsuarioUpdateInput): Promise<Usuario> {
    return await this.prisma.usuario.update({
      where: { id_usuario: id },
      data
    });
  }

  async updateLastAccess(id: number): Promise<Usuario> {
    return await this.prisma.usuario.update({
      where: { id_usuario: id },
      data: { ultimo_acesso: new Date() }
    });
  }

  async updatePasswordResetToken(id: number, token: string, expiresAt: Date): Promise<Usuario> {
    return await this.prisma.usuario.update({
      where: { id_usuario: id },
      data: {
        reset_token: token,
        reset_token_expira: expiresAt
      }
    });
  }

  async updatePassword(id: number, hashedPassword: string): Promise<void> {
    await this.prisma.usuario.update({
      where: { id_usuario: id },
      data: {
        senha_hash: hashedPassword,
        reset_token: null,
        reset_token_expira: null
      }
    });
  }
}
