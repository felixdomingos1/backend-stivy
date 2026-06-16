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
      email: string;
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
                email: true,
                telefone: true,
                foto_perfil: true
              }
            }
          }
        }
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
                email: true,
                foto_perfil: true
              }
            }
          }
        },
        servicoReacaos:true,
        imagens:true,
        servicoComentarios:true,
        servicoCompartilhamentos:true
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
                email: true,
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
                email: true,
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
    const servicos = await this.prisma.servico.findMany({
      where: { id_fazedor },
      include: {
        requisicoes: true
      }
    });

    const totalServicos = servicos.length;
    const servicosAtivos = servicos.filter(s => s.status === 'ativo').length;
    const servicosInativos = servicos.filter(s => s.status === 'inativo').length;
    const servicosPausados = servicos.filter(s => s.status === 'pausado').length;
    const totalRequisicoes = servicos.reduce((sum, s) => sum + s.requisicoes.length, 0);
    const valorMedio = totalServicos > 0
      ? servicos.reduce((sum, s) => sum + (s.valor?.toNumber() || 0), 0) / totalServicos
      : 0;

    const requisicoesPorStatus = {
      pendentes: 0,
      aceitas: 0,
      recusadas: 0,
      concluidas: 0,
      canceladas: 0
    };

    servicos.forEach(servico => {
      servico.requisicoes.forEach(req => {
        switch (req.status) {
          case 'pendente': requisicoesPorStatus.pendentes++; break;
          case 'aceita': requisicoesPorStatus.aceitas++; break;
          case 'recusada': requisicoesPorStatus.recusadas++; break;
          case 'concluida': requisicoesPorStatus.concluidas++; break;
          case 'cancelada': requisicoesPorStatus.canceladas++; break;
        }
      });
    });

    return {
      total_servicos: totalServicos,
      servicos_ativos: servicosAtivos,
      servicos_inativos: servicosInativos,
      servicos_pausados: servicosPausados,
      total_requisicoes: totalRequisicoes,
      valor_medio: Number(valorMedio.toFixed(2)),
      requisicoes_por_status: requisicoesPorStatus
    };
  }
}
