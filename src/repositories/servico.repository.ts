import { PrismaClient, Servico } from '@prisma/client';
import prisma from '../config/database';

export interface CreateServicoData {
  id_fazedor: string;
  titulo: string;
  descricao?: string;
  categoria?: string;
  valor?: number;
  imagem_url?: string;
  imagem_public_id?: string;
  tempo_estimado?: string;
}

export interface UpdateServicoData {
  titulo?: string;
  descricao?: string;
  categoria?: string;
  valor?: number;
  imagem_url?: string;
  imagem_public_id?: string;
  status?: string;
  tempo_estimado?: string;
}

export interface ServicoFilters {
  categoria?: string;
  min_valor?: number;
  max_valor?: number;
  status?: string;
  id_fazedor?: string;
  search?: string;
  /** Um ou mais tipos de fazedor (ex.: ['agencia', 'modelo_freelancer']). */
  tipos_fazedor?: string[];
}

export type ServicoWithRelations = Servico & {
  fazedor: {
    id_fazedor: string;
    tipo_fazedor: string;
    status_aprovacao: string;
    avaliacao_media: number | null;
    usuario: {
      id_usuario: string;
      nome: string;
      foto_perfil: string | null;
    };
  };
};

export class ServicoRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async create(data: CreateServicoData): Promise<Servico> {
    return await this.prisma.servico.create({
      data: {
        id_fazedor: data.id_fazedor,
        titulo: data.titulo,
        descricao: data.descricao,
        categoria: data.categoria,
        valor: data.valor,
        imagem_url: data.imagem_url,
        imagem_public_id: data.imagem_public_id,
        tempo_estimado: data.tempo_estimado,
        status: 'ativo'
      }
    });
  }

  async findById(id: string): Promise<ServicoWithRelations | null> {
    const result = await this.prisma.servico.findUnique({
      where: { id_servico: id },
      include: {
        fazedor: {
          include: {
            usuario: {
              select: {
                id_usuario: true,
                nome: true,
                foto_perfil: true,
                tipo: true
              }
            }
          }
        },
        imagens: { orderBy: { ordem: 'asc' } },
        _count: { select: { servicoReacaos: true, servicoComentarios: true, servicoCompartilhamentos: true } }
      }
    });

    return result as ServicoWithRelations | null;
  }

  async findAll(filters?: ServicoFilters, skip?: number, take?: number): Promise<ServicoWithRelations[]> {
    const where: any = {};

    if (filters?.categoria) {
      where.categoria = filters.categoria;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.id_fazedor) {
      where.id_fazedor = filters.id_fazedor;
    }

    if (filters?.tipos_fazedor?.length) {
      where.fazedor = { tipo_fazedor: { in: filters.tipos_fazedor } };
    }

    if (filters?.min_valor !== undefined || filters?.max_valor !== undefined) {
      where.valor = {};
      if (filters.min_valor !== undefined) {
        where.valor.gte = filters.min_valor;
      }
      if (filters.max_valor !== undefined) {
        where.valor.lte = filters.max_valor;
      }
    }

    if (filters?.search) {
      where.OR = [
        { titulo: { contains: filters.search } },
        { descricao: { contains: filters.search } }
      ];
    }

    const result = await this.prisma.servico.findMany({
      where,
      skip: skip || 0,
      take: take || 50,
      orderBy: { data_criacao: 'desc' },
      include: {
        fazedor: {
          include: {
            usuario: {
              select: {
                id_usuario: true,
                nome: true,
                foto_perfil: true
              }
            }
          }
        },
        // Linhas mínimas (compatibilidade com o app) + contagens agregadas
        servicoReacaos: { select: { id_reacao: true, id_usuario: true, tipo: true } },
        imagens: { orderBy: { ordem: 'asc' } },
        servicoComentarios: { select: { id_comentario: true } },
        servicoCompartilhamentos: { select: { id_compartilhamento: true } },
        _count: { select: { servicoReacaos: true, servicoComentarios: true, servicoCompartilhamentos: true } }
      }
    });

    return result as ServicoWithRelations[];
  }

  async count(filters?: ServicoFilters): Promise<number> {
    const where: any = {};

    if (filters?.categoria) {
      where.categoria = filters.categoria;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.id_fazedor) {
      where.id_fazedor = filters.id_fazedor;
    }

    if (filters?.tipos_fazedor?.length) {
      where.fazedor = { tipo_fazedor: { in: filters.tipos_fazedor } };
    }

    if (filters?.min_valor !== undefined || filters?.max_valor !== undefined) {
      where.valor = {};
      if (filters.min_valor !== undefined) {
        where.valor.gte = filters.min_valor;
      }
      if (filters.max_valor !== undefined) {
        where.valor.lte = filters.max_valor;
      }
    }

    if (filters?.search) {
      where.OR = [
        { titulo: { contains: filters.search } },
        { descricao: { contains: filters.search } }
      ];
    }

    return await this.prisma.servico.count({ where });
  }

  async update(id: string, data: UpdateServicoData): Promise<Servico> {
    return await this.prisma.servico.update({
      where: { id_servico: id },
      data: {
        titulo: data.titulo,
        descricao: data.descricao,
        categoria: data.categoria,
        valor: data.valor,
        imagem_url: data.imagem_url,
        imagem_public_id: data.imagem_public_id,
        tempo_estimado: data.tempo_estimado,
        status: data.status as any
      }
    });
  }

  async delete(id: string): Promise<Servico> {
    return await this.prisma.servico.delete({
      where: { id_servico: id }
    });
  }

  async findByFazedor(id_fazedor: string): Promise<ServicoWithRelations[]> {
    const result = await this.prisma.servico.findMany({
      where: { id_fazedor },
      orderBy: { data_criacao: 'desc' },
      include: {
        fazedor: {
          include: {
            usuario: {
              select: {
                id_usuario: true,
                nome: true,
                foto_perfil: true
              }
            }
          }
        }
      }
    });

    return result as ServicoWithRelations[];
  }

  async findByCategoria(categoria: string): Promise<ServicoWithRelations[]> {
    const result = await this.prisma.servico.findMany({
      where: { categoria },
      orderBy: { data_criacao: 'desc' },
      include: {
        fazedor: {
          include: {
            usuario: {
              select: {
                id_usuario: true,
                nome: true,
                foto_perfil: true
              }
            }
          }
        }
      }
    });

    return result as ServicoWithRelations[];
  }

  async getCategorias(): Promise<string[]> {
    const result = await this.prisma.servico.findMany({
      where: { status: 'ativo' },
      select: { categoria: true },
      distinct: ['categoria']
    });
    return result.map(r => r.categoria).filter((c): c is string => c !== null);
  }

  async updateStatus(id: string, status: string): Promise<Servico> {
    return await this.prisma.servico.update({
      where: { id_servico: id },
      data: { status: status as any }
    });
  }

  async getEstatisticas(id_fazedor: string): Promise<any> {
    const [porStatus, media, reqPorStatus] = await Promise.all([
      this.prisma.servico.groupBy({ by: ['status'], where: { id_fazedor }, _count: { _all: true } }),
      this.prisma.servico.aggregate({ where: { id_fazedor }, _avg: { valor: true } }),
      this.prisma.requisicao.groupBy({ by: ['status'], where: { servico: { id_fazedor } }, _count: { _all: true } })
    ]);

    const s = (st: string) => porStatus.find(g => g.status === st)?._count._all ?? 0;
    const r = (st: string) => reqPorStatus.find(g => g.status === st)?._count._all ?? 0;
    const totalServicos = porStatus.reduce((sum, g) => sum + g._count._all, 0);
    const totalRequisicoes = reqPorStatus.reduce((sum, g) => sum + g._count._all, 0);

    return {
      total_servicos: totalServicos,
      servicos_ativos: s('ativo'),
      servicos_inativos: s('inativo'),
      servicos_pausados: s('pausado'),
      total_requisicoes: totalRequisicoes,
      valor_medio: Number(Number(media._avg.valor ?? 0).toFixed(2)),
      requisicoes_por_status: {
        pendentes: r('pendente'),
        aceitas: r('aceita'),
        recusadas: r('recusada'),
        concluidas: r('concluida'),
        canceladas: r('cancelada')
      }
    };
  }
}
