import { Usuario, Prisma } from '@prisma/client';

export interface IUserRepository {
  findByEmail(email: string): Promise<Usuario | null>;
  findByIdComplete(id: string): Promise<Usuario | null>;
  findById(id: string): Promise<Omit<Usuario, 'senha_hash' | 'reset_token' | 'reset_token_expira'> | null>;
  create(data: Prisma.UsuarioCreateInput): Promise<Usuario>;
  update(id: string, data: Prisma.UsuarioUpdateInput): Promise<Usuario>;
  updateLastAccess(id: string): Promise<Usuario>;
  updatePasswordResetToken(id: string, token: string, expiresAt: Date): Promise<Usuario>;
  updatePassword(id: string, hashedPassword: string): Promise<void>;
}
