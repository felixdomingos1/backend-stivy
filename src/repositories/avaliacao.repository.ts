import { PrismaClient, Avaliacao } from '@prisma/client';
import prisma from '../config/database';

export interface CreateAvaliacaoData {
  id_avaliador: string;
  id_avaliado: string;
  nota: number;
  comentario?: string;
}

export interface UpdateAvaliacaoData {
  nota?: number;
  comentario?: string;
}

export interface AvaliacaoFilters {
  nota_min?: number;
  nota_max?: number;
  data_inicio?: Date;
  data_fim?: Date;
  id_avaliador?: string;
  id_avaliado?: string;
}

export class AvaliacaoRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async create(data: CreateAvaliacaoData): Promise<Avaliacao> {
    const avaliacao = await this.prisma.avaliacao.create({
      data: {
        id_avaliador: data.id_avaliador,
        id_avaliado: data.id_avaliado,
        nota: data.nota,
        comentario: data.comentario
      },
      include: {
        avaliador: {
          select: {
            id_usuario: true,
            nome: true,
            email: true,
            foto_perfil: true
          }
        },
        avaliado: {
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
      }
    });

    // Atualizar média e total de avaliações do fazedor
    await this.updateFazedorMedia(data.id_avaliado);

    return avaliacao;
  }

  async findById(id: string): Promise<Avaliacao | null> {
    return await this.prisma.avaliacao.findUnique({
      where: { id_avaliacao: id },
      include: {
        avaliador: {
          select: {
            id_usuario: true,
            nome: true,
            email: true,
            foto_perfil: true
          }
        },
        avaliado: {
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
      }
    });
  }

  async findByAvaliado(id_avaliado: string, filters?: AvaliacaoFilters, skip?: number, take?: number): Promise<Avaliacao[]> {
    const where: any = { id_avaliado };

    if (filters?.nota_min !== undefined || filters?.nota_max !== undefined) {
      where.nota = {};
      if (filters.nota_min !== undefined) {
        where.nota.gte = filters.nota_min;
      }
      if (filters.nota_max !== undefined) {
        where.nota.lte = filters.nota_max;
      }
    }

    if (filters?.data_inicio || filters?.data_fim) {
      where.data_avaliacao = {};
      if (filters.data_inicio) {
        where.data_avaliacao.gte = filters.data_inicio;
      }
      if (filters.data_fim) {
        where.data_avaliacao.lte = filters.data_fim;
      }
    }

    return await this.prisma.avaliacao.findMany({
      where,
      skip: skip || 0,
      take: take || 50,
      orderBy: { data_avaliacao: 'desc' },
      include: {
        avaliador: {
          select: {
            id_usuario: true,
            nome: true,
            email: true,
            foto_perfil: true
          }
        }
      }
    });
  }

  async findByAvaliador(id_avaliador: string): Promise<Avaliacao[]> {
    return await this.prisma.avaliacao.findMany({
      where: { id_avaliador },
      orderBy: { data_avaliacao: 'desc' },
      include: {
        avaliado: {
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
      }
    });
  }

  async countByAvaliado(id_avaliado: string): Promise<number> {
    return await this.prisma.avaliacao.count({
      where: { id_avaliado }
    });
  }

  async update(id: string, data: UpdateAvaliacaoData): Promise<Avaliacao> {
    const avaliacao = await this.prisma.avaliacao.update({
      where: { id_avaliacao: id },
      data: {
        nota: data.nota,
        comentario: data.comentario
      }
    });

    // Atualizar média do fazedor
    await this.updateFazedorMedia(avaliacao.id_avaliado);

    return avaliacao;
  }

  async delete(id: string): Promise<Avaliacao> {
    const avaliacao = await this.prisma.avaliacao.delete({
      where: { id_avaliacao: id }
    });

    // Atualizar média do fazedor
    await this.updateFazedorMedia(avaliacao.id_avaliado);

    return avaliacao;
  }

  async getMediaAvaliacao(id_avaliado: string): Promise<{ media: number; total: number }> {
    const result = await this.prisma.avaliacao.aggregate({
      where: { id_avaliado },
      _avg: { nota: true },
      _count: { nota: true }
    });

    return {
      media: result._avg.nota || 0,
      total: result._count.nota || 0
    };
  }

  async getDistribuicaoNotas(id_avaliado: string): Promise<any> {
    const result = await this.prisma.avaliacao.groupBy({
      by: ['nota'],
      where: { id_avaliado },
      _count: { nota: true }
    });

    const distribuicao = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    };

    result.forEach(item => {
      if (item.nota >= 1 && item.nota <= 5) {
        distribuicao[item.nota as keyof typeof distribuicao] = item._count.nota;
      }
    });

    return distribuicao;
  }

  async jaAvaliou(id_avaliador: string, id_avaliado: string): Promise<boolean> {
    const avaliacao = await this.prisma.avaliacao.findUnique({
      where: {
        id_avaliador_id_avaliado: {
          id_avaliador,
          id_avaliado
        }
      }
    });
    return !!avaliacao;
  }

  private async updateFazedorMedia(id_fazedor: string): Promise<void> {
    const { media, total } = await this.getMediaAvaliacao(id_fazedor);

    await this.prisma.fazedor.update({
      where: { id_fazedor },
      data: {
        avaliacao_media: media,
        total_avaliacoes: total
      }
    });
  }

  async getEstatisticas(id_fazedor: string): Promise<any> {
    const media = await this.getMediaAvaliacao(id_fazedor);
    const distribuicao = await this.getDistribuicaoNotas(id_fazedor);

    // Avaliações dos últimos 30 dias
    const ultimos30Dias = new Date();
    ultimos30Dias.setDate(ultimos30Dias.getDate() - 30);

    const avaliacoesRecentes = await this.prisma.avaliacao.count({
      where: {
        id_avaliado: id_fazedor,
        data_avaliacao: { gte: ultimos30Dias }
      }
    });

    // Avaliações com comentário
    const avaliacoesComComentario = await this.prisma.avaliacao.count({
      where: {
        id_avaliado: id_fazedor,
        comentario: { not: null }
      }
    });

    return {
      media_geral: media.media,
      total_avaliacoes: media.total,
      distribuicao_notas: distribuicao,
      avaliacoes_ultimos_30_dias: avaliacoesRecentes,
      avaliacoes_com_comentario: avaliacoesComComentario,
      percentual_com_comentario: media.total > 0 ? (avaliacoesComComentario / media.total) * 100 : 0
    };
  }

  async getTopAvaliados(limit: number = 10, tipo?: string): Promise<any[]> {
    const where: any = {};

    if (tipo) {
      where.tipo_fazedor = tipo;
    }

    const fazedores = await this.prisma.fazedor.findMany({
      where,
      orderBy: [
        { avaliacao_media: 'desc' },
        { total_avaliacoes: 'desc' }
      ],
      take: limit,
      include: {
        usuario: {
          select: {
            nome: true,
            email: true,
            foto_perfil: true
          }
        }
      }
    });

    return fazedores.map(f => ({
      id: f.id_fazedor,
      nome: f.usuario.nome,
      tipo_fazedor: f.tipo_fazedor,
      avaliacao_media: f.avaliacao_media,
      total_avaliacoes: f.total_avaliacoes,
      foto_perfil: f.usuario.foto_perfil
    }));
  }
}
