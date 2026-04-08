import { PrismaClient, ServicoComentario, ReacaoTipo } from '@prisma/client';
import prisma from '../config/database';

export class ServicoComentarioRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async create(data: {
    id_servico: string;
    id_usuario: string;
    comentario: string;
    parent_id?: string;
  }): Promise<ServicoComentario> {
    return await this.prisma.servicoComentario.create({
      data: {
        id_servico: data.id_servico,
        id_usuario: data.id_usuario,
        comentario: data.comentario,
        parent_id: data.parent_id
      },
      include: {
        usuario: {
          select: {
            id_usuario: true,
            nome: true,
            foto_perfil: true
          }
        }
      }
    });
  }

  async findByServico(id_servico: string, page: number = 1, limit: number = 20): Promise<{
    comentarios: any[];
    total: number;
  }> {
    const skip = (page - 1) * limit;

    const [comentarios, total] = await Promise.all([
      this.prisma.servicoComentario.findMany({
        where: {
          id_servico,
          parent_id: null
        },
        include: {
          usuario: {
            select: {
              id_usuario: true,
              nome: true,
              foto_perfil: true
            }
          },
          respostas: {
            include: {
              usuario: {
                select: {
                  id_usuario: true,
                  nome: true,
                  foto_perfil: true
                }
              },
              reacoes: true
            },
            orderBy: { data_criacao: 'asc' },
            take: 3
          },
          reacoes: true
        },
        orderBy: { data_criacao: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.servicoComentario.count({
        where: {
          id_servico,
          parent_id: null
        }
      })
    ]);

    return { comentarios, total };
  }

  async findComentarioById(id_comentario: string): Promise<any | null> {
    return await this.prisma.servicoComentario.findFirst({
      where: {
        id_comentario,
      },
      include: {
        usuario: {
          select: {
            id_usuario: true,
            nome: true,
            foto_perfil: true
          }
        },
        respostas: {
          include: {
            usuario: {
              select: {
                id_usuario: true,
                nome: true,
                foto_perfil: true
              }
            },
            reacoes: true
          },
          orderBy: { data_criacao: 'asc' },
          take: 3
        },
        reacoes: true
      }
    });
  }

  async addReacao(data: {
    id_comentario: string;
    id_usuario: string;
    tipo: ReacaoTipo;
  }): Promise<void> {

    const existing = await this.prisma.servicoComentarioReacao.findUnique({
      where: {
        id_comentario_id_usuario: {
          id_comentario: data.id_comentario,
          id_usuario: data.id_usuario
        }
      }
    });

    if (existing) {
      if (existing.tipo === data.tipo) {
        await this.prisma.servicoComentarioReacao.delete({
          where: {
            id_comentario_id_usuario: {
              id_comentario: data.id_comentario,
              id_usuario: data.id_usuario
            }
          }
        });

      } else {
        await this.prisma.servicoComentarioReacao.update({
          where: {
            id_comentario_id_usuario: {
              id_comentario: data.id_comentario,
              id_usuario: data.id_usuario
            }
          },
          data: { tipo: data.tipo }
        });
      }

    } else {
      await this.prisma.servicoComentarioReacao.create({
        data
      });
    }

    const reacoesCount = await this.prisma.servicoComentarioReacao.count({
      where: { id_comentario: data.id_comentario }
    });

    await this.prisma.servicoComentario.update({
      where: { id_comentario: data.id_comentario },
      data: { curtidas: reacoesCount }
    });
  }

  async removeReacao(id_comentario: string, id_usuario: string): Promise<void> {
    await this.prisma.servicoComentarioReacao.delete({
      where: {
        id_comentario_id_usuario: {
          id_comentario,
          id_usuario
        }
      }
    });

    const reacoesCount = await this.prisma.servicoComentarioReacao.count({
      where: { id_comentario }
    });

    await this.prisma.servicoComentario.update({
      where: { id_comentario },
      data: { curtidas: reacoesCount }
    });
  }

  async delete(id_comentario: string): Promise<void> {
    await this.prisma.servicoComentario.delete({
      where: { id_comentario }
    });
  }

  async update(id_comentario: string, comentario: string): Promise<ServicoComentario> {
    return await this.prisma.servicoComentario.update({
      where: { id_comentario },
      data: {
        comentario,
        data_edicao: new Date(),
        editado: true
      }
    });
  }
}
