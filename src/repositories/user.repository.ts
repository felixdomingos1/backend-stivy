import { Prisma, PrismaClient, Usuario } from '@prisma/client';
import prisma from '../config/database';
import { usuarioPrivadoSelect, usuarioPublicoSelect, UsuarioPrivado, UsuarioPublico } from '../utils/prisma-selects';

/**
 * Repositório de utilizadores.
 * - findById / findPublicById / findAllPaginated: NUNCA devolvem senha_hash, códigos OTP/reset,
 *   tentativas ou reset_token*.
 * - findByEmail / findByIdComplete: registo completo — uso EXCLUSIVO interno (auth), nunca enviar ao cliente.
 */
export class UserRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    return await this.prisma.usuario.findUnique({
      where: { email }
    });
  }

  async findByIdComplete(id: string): Promise<Usuario | null> {
    return await this.prisma.usuario.findUnique({
      where: { id_usuario: id }
    });
  }

  async findById(id: string): Promise<UsuarioPrivado | null> {
    return await this.prisma.usuario.findUnique({
      where: { id_usuario: id },
      select: usuarioPrivadoSelect
    });
  }

  async findPublicById(id: string): Promise<UsuarioPublico | null> {
    return await this.prisma.usuario.findUnique({
      where: { id_usuario: id },
      select: usuarioPublicoSelect
    });
  }

  async findFotoPerfilPublicId(id: string): Promise<string | null> {
    const u = await this.prisma.usuario.findUnique({
      where: { id_usuario: id },
      select: { foto_perfil_public_id: true }
    });
    return u?.foto_perfil_public_id ?? null;
  }

  async create(data: Prisma.UsuarioCreateInput): Promise<Usuario> {
    return await this.prisma.usuario.create({ data });
  }

  async update(id: string, data: Prisma.UsuarioUpdateInput): Promise<Usuario> {
    return await this.prisma.usuario.update({
      where: { id_usuario: id },
      data
    });
  }

  async updateLastAccess(id: string): Promise<Usuario> {
    return await this.prisma.usuario.update({
      where: { id_usuario: id },
      data: { ultimo_acesso: new Date() }
    });
  }

  async updatePasswordResetToken(id: string, token: string, expiresAt: Date): Promise<Usuario> {
    return await this.prisma.usuario.update({
      where: { id_usuario: id },
      data: {
        reset_token: token,
        reset_token_expira: expiresAt
      }
    });
  }

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await this.prisma.usuario.update({
      where: { id_usuario: id },
      data: {
        senha_hash: hashedPassword,
        reset_token: null,
        reset_token_expira: null,
        reset_password_code: null,
        reset_password_expira: null,
        reset_password_attempts: 0
      }
    });
  }

  async incrementVerificationAttempts(id: string): Promise<void> {
    await this.prisma.usuario.update({
      where: { id_usuario: id },
      data: {
        verification_attempts: {
          increment: 1
        }
      }
    });
  }

  async markEmailAsVerified(id: string): Promise<void> {
    await this.prisma.usuario.update({
      where: { id_usuario: id },
      data: {
        email_verificado: true,
        email_verification_code: null,
        email_verification_expira: null,
        verification_attempts: 0
      }
    });
  }

  async updateVerificationCode(id: string, code: string, expiresAt: Date): Promise<void> {
    await this.prisma.usuario.update({
      where: { id_usuario: id },
      data: {
        email_verification_code: code,
        email_verification_expira: expiresAt,
        verification_attempts: 0
      }
    });
  }


  async updateUser(id: string, data: any): Promise<UsuarioPrivado> {
    // Allowlist: tipo/status NUNCA são alterados por esta via (apenas admin, com métodos próprios)
    const allowedFields = [
      'nome',
      'telefone',
      'banner_url',
      'banner_public_id'
    ];

    const filteredData = Object.keys(data)
      .filter(key => allowedFields.includes(key) && data[key] !== undefined)
      .reduce((obj, key) => {
        obj[key] = data[key];
        return obj;
      }, {} as any);

    return await this.prisma.usuario.update({
      where: { id_usuario: id },
      data: filteredData,
      select: usuarioPrivadoSelect
    });
  }

  async addFavorito(usuarioId: string, fazedorId: string): Promise<void> {
    await this.prisma.favorito.create({
      data: {
        id_usuario: usuarioId,
        id_fazedor: fazedorId
      }
    });
  }

  async removeFavorito(usuarioId: string, fazedorId: string): Promise<void> {
    await this.prisma.favorito.delete({
      where: {
        id_usuario_id_fazedor: {
          id_usuario: usuarioId,
          id_fazedor: fazedorId
        }
      }
    });
  }

  async listFavoritos(usuarioId: string): Promise<any[]> {
    return await this.prisma.favorito.findMany({
      where: { id_usuario: usuarioId },
      include: {
        fazedor: {
          include: {
            usuario: {
              select: usuarioPublicoSelect
            }
          }
        }
      },
      orderBy: { data_adicao: 'desc' }
    });
  }

  async isFavorito(usuarioId: string, fazedorId: string): Promise<boolean> {
    const favorito = await this.prisma.favorito.findUnique({
      where: {
        id_usuario_id_fazedor: {
          id_usuario: usuarioId,
          id_fazedor: fazedorId
        }
      }
    });
    return !!favorito;
  }

  async updateFotoPerfil(id: string, fotoUrl: string): Promise<void> {
    await this.prisma.usuario.update({
      where: { id_usuario: id },
      data: { foto_perfil: fotoUrl }
    });
  }


  async updatePasswordResetOTP(email: string, code: string, expiresAt: Date): Promise<void> {
    await this.prisma.usuario.update({
      where: { email },
      data: {
        reset_password_code: code,
        reset_password_expira: expiresAt,
        reset_password_attempts: 0
      }
    });
  }

  async findByPasswordResetOTP(email: string, code: string): Promise<Usuario | null> {
    return await this.prisma.usuario.findFirst({
      where: {
        email,
        reset_password_code: code,
        reset_password_expira: { gt: new Date() }
      }
    });
  }

  async incrementResetPasswordAttempts(email: string): Promise<number> {
    const u = await this.prisma.usuario.update({
      where: { email },
      data: {
        reset_password_attempts: {
          increment: 1
        }
      },
      select: { reset_password_attempts: true }
    });
    return u.reset_password_attempts;
  }

  async clearPasswordResetOTP(email: string): Promise<void> {
    await this.prisma.usuario.update({
      where: { email },
      data: {
        reset_password_code: null,
        reset_password_expira: null,
        reset_password_attempts: 0
      }
    });
  }

  async findAllPaginated(page: number, limit: number): Promise<{ items: any[]; total: number }> {
    const [items, total] = await Promise.all([
      this.prisma.usuario.findMany({
        select: {
          ...usuarioPrivadoSelect,
          fazedor: {
            select: { id_fazedor: true, tipo_fazedor: true, status_aprovacao: true }
          },
          _count: {
            select: { seguidores: true, seguindo: true, favoritos: true, stories: true }
          }
        },
        orderBy: { data_cadastro: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.usuario.count()
    ]);
    return { items, total };
  }

  async followUser(seguidorId: string, seguidoId: string): Promise<void> {
    await this.prisma.seguidor.create({
      data: {
        id_seguidor_usuario: seguidorId,
        id_seguido: seguidoId,
      },
    });
  }

  async unfollowUser(seguidorId: string, seguidoId: string): Promise<void> {
    await this.prisma.seguidor.delete({
      where: {
        id_seguidor_usuario_id_seguido: {
          id_seguidor_usuario: seguidorId,
          id_seguido: seguidoId,
        },
      },
    });
  }

  async isFollowing(seguidorId: string, seguidoId: string): Promise<boolean> {
    const seguidor = await this.prisma.seguidor.findUnique({
      where: {
        id_seguidor_usuario_id_seguido: {
          id_seguidor_usuario: seguidorId,
          id_seguido: seguidoId,
        },
      },
    });
    return !!seguidor;
  }

  async getSeguidores(userId: string): Promise<any[]> {
    return this.prisma.seguidor.findMany({
      where: { id_seguido: userId },
      include: {
        seguidor: {
          select: usuarioPublicoSelect,
        },
      },
      orderBy: { data_inicio: 'desc' },
    });
  }

  async getSeguindo(userId: string): Promise<any[]> {
    return this.prisma.seguidor.findMany({
      where: { id_seguidor_usuario: userId },
      include: {
        seguido: {
          select: usuarioPublicoSelect,
        },
      },
      orderBy: { data_inicio: 'desc' },
    });
  }

  async countSeguidores(userId: string): Promise<number> {
    return this.prisma.seguidor.count({ where: { id_seguido: userId } });
  }

  async countSeguindo(userId: string): Promise<number> {
    return this.prisma.seguidor.count({ where: { id_seguidor_usuario: userId } });
  }
}
