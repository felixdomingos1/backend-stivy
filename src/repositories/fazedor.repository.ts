// repositories/fazedor.repository.ts
import { PrismaClient } from '@prisma/client';
import prisma from '../config/database';

export interface FazedorFilters {
  tipo_fazedor?: string;
  status_aprovacao?: string;
  avaliacao_minima?: number;
  search?: string;
  cidade?: string;
}

export class FazedorRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async findById(id: string) {
    return await this.prisma.fazedor.findUnique({
      where: { id_fazedor: id },
      include: {
        usuario: {
          select: {
            id_usuario: true,
            nome: true,
            email: true,
            telefone: true,
            foto_perfil: true,
            data_cadastro: true
          }
        }
      }
    });
  }

  async createFazedor(data: {
    id_usuario: string;
    tipo_fazedor: string;
    status_aprovacao?: string;
  }) {
    return await this.prisma.fazedor.create({
      data: {
        id_usuario: data.id_usuario,
        tipo_fazedor: data.tipo_fazedor as any,
        status_aprovacao: (data.status_aprovacao as any) || 'pendente'
      }
    });
  }

  async findFazedorByUserId(userId: string) {
    return await this.prisma.fazedor.findUnique({
      where: { id_usuario: userId },
      include: {
        agencia: true,
        modeloFreelancer: true,
        estilista: true,
        maquiador: true,
        fotografo: true,
        usuario: true
      }
    });
  }

  async findFazedorWithDetails(userId: string) {
    return await this.prisma.fazedor.findUnique({
      where: { id_usuario: userId },
      include: {
        usuario: true,
        agencia: {
          include: { modelos: true }
        },
        modeloFreelancer: true,
        estilista: true,
        maquiador: true,
        fotografo: true,
        servicos: true
      }
    });
  }

  async findAll(filters?: FazedorFilters, skip?: number, take?: number): Promise<any[]> {
    const where: any = {};

    if (filters?.tipo_fazedor) {
      where.tipo_fazedor = filters.tipo_fazedor;
    }

    if (filters?.status_aprovacao) {
      where.status_aprovacao = filters.status_aprovacao;
    } else {
      where.status_aprovacao = 'aprovado';
    }

    if (filters?.avaliacao_minima !== undefined) {
      where.avaliacao_media = {
        gte: filters.avaliacao_minima
      };
    }

    // Busca por texto (nome do usuário ou biografia)
    if (filters?.search) {
      where.OR = [
        {
          usuario: {
            nome: {
              contains: filters.search
            }
          }
        },
        {
          biografia: {
            contains: filters.search
          }
        },
        {
          instagram: {
            contains: filters.search
          }
        }
      ];
    }

    // Filtrar por cidade (através do endereço)
    if (filters?.cidade) {
      where.endereco = {
        contains: filters.cidade
      };
    }

    const result = await this.prisma.fazedor.findMany({
      where,
      skip: skip || 0,
      take: take || 20,
      orderBy: [
        { avaliacao_media: 'desc' },
        { total_avaliacoes: 'desc' }
      ],
      include: {
        usuario: {
          select: {
            id_usuario: true,
            nome: true,
            email: true,
            telefone: true,
            foto_perfil: true,
            data_cadastro: true
          }
        },
        agencia: {
          select: {
            id_agencia: true,
            nome_agencia: true,
            logo_url: true
          }
        },
        modeloFreelancer: {
          select: {
            id_modelo_freelancer: true,
            nome_artistico: true,
            foto_url: true,
            cache_medio: true
          }
        },
        estilista: {
          select: {
            id_estilista: true,
            nome_marca: true,
            especialidade: true,
            logo_url: true
          }
        },
        maquiador: {
          select: {
            id_maquiador: true,
            especialidade: true,
            portifolio_url: true
          }
        },
        fotografo: {
          select: {
            id_fotografo: true,
            especialidade: true,
            portifolio_url: true
          }
        },
        servicos: {
          where: { status: 'ativo' },
          take: 3,
          select: {
            id_servico: true,
            titulo: true,
            valor: true,
            categoria: true
          }
        }
      }
    });

    return result;
  }

  // NOVA FUNÇÃO: count com filtros
  async count(filters?: FazedorFilters): Promise<number> {
    const where: any = {};

    if (filters?.tipo_fazedor) {
      where.tipo_fazedor = filters.tipo_fazedor;
    }

    if (filters?.status_aprovacao) {
      where.status_aprovacao = filters.status_aprovacao;
    } else {
      where.status_aprovacao = 'aprovado';
    }

    if (filters?.avaliacao_minima !== undefined) {
      where.avaliacao_media = {
        gte: filters.avaliacao_minima
      };
    }

    if (filters?.search) {
      where.OR = [
        {
          usuario: {
            nome: {
              contains: filters.search
            }
          }
        },
        {
          biografia: {
            contains: filters.search
          }
        },
        {
          instagram: {
            contains: filters.search
          }
        }
      ];
    }

    if (filters?.cidade) {
      where.endereco = {
        contains: filters.cidade
      };
    }

    return await this.prisma.fazedor.count({ where });
  }

  // Função adicional: buscar fazedores por tipo
  async findByTipo(tipo: string, skip?: number, take?: number): Promise<any[]> {
    return await this.prisma.fazedor.findMany({
      where: {
        tipo_fazedor: tipo as any,
        status_aprovacao: 'aprovado'
      },
      skip: skip || 0,
      take: take || 20,
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
    });
  }

  // Função adicional: buscar fazedores por avaliação
  async findByAvaliacao(minNota: number, skip?: number, take?: number): Promise<any[]> {
    return await this.prisma.fazedor.findMany({
      where: {
        status_aprovacao: 'aprovado',
        avaliacao_media: {
          gte: minNota
        }
      },
      skip: skip || 0,
      take: take || 20,
      orderBy: {
        avaliacao_media: 'desc'
      },
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
    });
  }

  // Função adicional: buscar fazedores pendentes (para admin)
  async findPendentes(skip?: number, take?: number): Promise<any[]> {
    return await this.prisma.fazedor.findMany({
      where: {
        status_aprovacao: 'pendente'
      },
      skip: skip || 0,
      take: take || 20,
      include: {
        usuario: {
          select: {
            id_usuario: true,
            nome: true,
            email: true,
            telefone: true,
            foto_perfil: true,
            data_cadastro: true
          }
        }
      }
    });
  }

  // Função adicional: aprovar fazedor
  async aprovarFazedor(id: string): Promise<any> {
    return await this.prisma.fazedor.update({
      where: { id_fazedor: id },
      data: {
        status_aprovacao: 'aprovado',
        data_aprovacao: new Date()
      }
    });
  }

  // Função adicional: rejeitar fazedor
  async rejeitarFazedor(id: string, motivo?: string): Promise<any> {
    return await this.prisma.fazedor.update({
      where: { id_fazedor: id },
      data: {
        status_aprovacao: 'rejeitado'
      }
    });
  }

  // Função adicional: atualizar avaliação média
  async updateAvaliacaoMedia(id: string, media: number, total: number): Promise<any> {
    return await this.prisma.fazedor.update({
      where: { id_fazedor: id },
      data: {
        avaliacao_media: media,
        total_avaliacoes: total
      }
    });
  }

  // Função adicional: buscar fazedores por proximidade (se tiver latitude/longitude)
  async findByProximidade(latitude: number, longitude: number, raioKm: number = 10): Promise<any[]> {
    // Nota: Esta é uma implementação simplificada
    // Para uma busca precisa, considere usar extensões GIS no MySQL
    return await this.prisma.fazedor.findMany({
      where: {
        status_aprovacao: 'aprovado',
        endereco: {
          not: null
        }
      },
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
    });
  }

  // Função adicional: estatísticas gerais
  async getEstatisticasGerais(): Promise<any> {
    const [total, porTipo, porStatus, aprovados, pendentes, rejeitados] = await Promise.all([
      this.prisma.fazedor.count(),
      this.prisma.fazedor.groupBy({
        by: ['tipo_fazedor'],
        _count: true
      }),
      this.prisma.fazedor.groupBy({
        by: ['status_aprovacao'],
        _count: true
      }),
      this.prisma.fazedor.count({ where: { status_aprovacao: 'aprovado' } }),
      this.prisma.fazedor.count({ where: { status_aprovacao: 'pendente' } }),
      this.prisma.fazedor.count({ where: { status_aprovacao: 'rejeitado' } })
    ]);

    const mediaAvaliacao = await this.prisma.fazedor.aggregate({
      where: { status_aprovacao: 'aprovado' },
      _avg: { avaliacao_media: true }
    });

    return {
      total,
      aprovados,
      pendentes,
      rejeitados,
      por_tipo: porTipo,
      por_status: porStatus,
      media_avaliacao_geral: mediaAvaliacao._avg.avaliacao_media || 0
    };
  }
}
