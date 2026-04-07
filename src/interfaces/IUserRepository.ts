import { Usuario, Prisma } from '@prisma/client';

export interface IUserRepository {
  findByEmail(email: string): Promise<Usuario | null>;
  findByIdComplete(id: number): Promise<Usuario | null>;
  findById(id: number): Promise<Omit<Usuario, 'senha_hash' | 'reset_token' | 'reset_token_expira'> | null>;
  create(data: Prisma.UsuarioCreateInput): Promise<Usuario>;
  update(id: number, data: Prisma.UsuarioUpdateInput): Promise<Usuario>;
  updateLastAccess(id: number): Promise<Usuario>;
  updatePasswordResetToken(id: number, token: string, expiresAt: Date): Promise<Usuario>;
  updatePassword(id: number, hashedPassword: string): Promise<void>;
}
