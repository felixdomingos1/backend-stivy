import { Prisma, PrismaClient, Usuario } from '@prisma/client';
import prisma from '../config/database';
import { IUserRepository } from '../interfaces/IUserRepository';

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

  async findByIdComplete(id: string): Promise<Usuario | null> {
    return await this.prisma.usuario.findUnique({
      where: { id_usuario: id }
    });
  }

  async findById(id: string): Promise<Omit<Usuario, 'senha_hash' | 'reset_token' | 'reset_token_expira'> | null> {
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
        ultimo_acesso: true,
        email_verificado: true,
        email_verification_code: true,
        email_verification_expira: true,
        verification_attempts: true,
        reset_password_attempts: true,
        reset_password_code: true,
        reset_password_expira: true,
        banner_url:true,
        banner_public_id:true,
        foto_perfil_public_id:true,
      }
    });
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
        reset_token_expira: null
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


  async updateUser(id: string, data: any): Promise<Usuario> {
    const allowedFields = [
      'nome',
      'telefone',
      'tipo',
      'status',
      'banner_url',
      'banner_public_id'
    ];

    const filteredData = Object.keys(data)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = data[key];
        return obj;
      }, {} as any);

    return await this.prisma.usuario.update({
      where: { id_usuario: id },
      data: filteredData
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
              select: {
                nome: true,
                email: true,
                foto_perfil: true
              }
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

  async incrementResetPasswordAttempts(email: string): Promise<void> {
    await this.prisma.usuario.update({
      where: { email },
      data: {
        reset_password_attempts: {
          increment: 1
        }
      }
    });
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

  async findAll(): Promise<any[]> {
    return this.prisma.usuario.findMany({
      include: {
        fazedor: true,
        favoritos: true,
        notificacoes: true,
        requisicoes: true,
        eventosParticipados: true,
        avaliacoesFeitas: true,
        stories:true,
        _count:true
      }
    });
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
          select: {
            id_usuario: true,
            nome: true,
            email: true,
            foto_perfil: true,
          },
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
          select: {
            id_usuario: true,
            nome: true,
            email: true,
            foto_perfil: true,
          },
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
