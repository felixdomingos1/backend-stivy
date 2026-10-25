import { PrismaClient, Requisicao, Prisma } from '@prisma/client';
import prisma from '../config/database';
import { usuarioPublicoSelect } from '../utils/prisma-selects';

export interface CreateRequisicaoData {
  id_solicitante: string;
  id_servico?: string;
  id_modelo?: string;
  mensagem?: string;
  contato_retorno?: string;
}

export interface UpdateRequisicaoData {
  status?: string;
  mensagem?: string;
  contato_retorno?: string;
  observacoes?: string;
  data_resposta?: Date;
}

export interface RequisicaoFilters {
  status?: string;
  id_solicitante?: string;
  id_fazedor?: string;
  data_inicio?: Date;
  data_fim?: Date;
}

/** Forma pública de uma requisição (contrato): nunca dados sensíveis dos utilizadores. */
export const requisicaoSelect = {
  id_requisicao: true,
  id_solicitante: true,
  id_servico: true,
  id_modelo: true,
  status: true,
  mensagem: true,
  contato_retorno: true,
  data_requisicao: true,
  data_resposta: true,
  observacoes: true,
  solicitante: { select: usuarioPublicoSelect },
  servico: {
    select: {
      id_servico: true,
      titulo: true,
      valor: true,
      imagem_url: true,
      fazedor: {
        select: {
          id_fazedor: true,
          id_usuario: true,
          usuario: { select: usuarioPublicoSelect },
        },
      },
    },
  },
  modelo: {
    select: {
      id_modelo: true,
      nome_artistico: true,
      nome_completo: true,
      foto_url: true,
      agencia: {
        select: {
          id_agencia: true,
          nome_agencia: true,
          logo_url: true,
          fazedor: {
            select: {
              id_fazedor: true,
              id_usuario: true,
              usuario: { select: usuarioPublicoSelect },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.RequisicaoSelect;

export type RequisicaoWithRelations = Prisma.RequisicaoGetPayload<{ select: typeof requisicaoSelect }>;

/** Converte Decimal -> number para o contrato. */
export const formatRequisicao = (r: RequisicaoWithRelations | null): any => {
  if (!r) return r;
  return {
    ...r,
    servico: r.servico
      ? { ...r.servico, valor: r.servico.valor !== null && r.servico.valor !== undefined ? Number(r.servico.valor) : null }
      : null,
  };
};

const whereRecebidas = (id_fazedor: string): Prisma.RequisicaoWhereInput => ({
  OR: [
    { servico: { id_fazedor } },
    { modelo: { agencia: { id_fazedor } } },
  ],
});

export class RequisicaoRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  private buildWhere(filters?: RequisicaoFilters): Prisma.RequisicaoWhereInput {
    const where: Prisma.RequisicaoWhereInput = {};

    if (filters?.status) {
      where.status = filters.status as any;
    }

    if (filters?.id_solicitante) {
      where.id_solicitante = filters.id_solicitante;
    }

    if (filters?.id_fazedor) {
      Object.assign(where, whereRecebidas(filters.id_fazedor));
    }

    if (filters?.data_inicio || filters?.data_fim) {
      where.data_requisicao = {
        ...(filters.data_inicio && { gte: filters.data_inicio }),
        ...(filters.data_fim && { lte: filters.data_fim }),
      };
    }

    return where;
  }

  async create(data: CreateRequisicaoData): Promise<RequisicaoWithRelations> {
    return await this.prisma.requisicao.create({
      data: {
        id_solicitante: data.id_solicitante,
        id_servico: data.id_servico,
        id_modelo: data.id_modelo,
        mensagem: data.mensagem,
        contato_retorno: data.contato_retorno,
        status: 'pendente'
      },
      select: requisicaoSelect
    });
  }

  async findById(id: string): Promise<RequisicaoWithRelations | null> {
    return await this.prisma.requisicao.findUnique({
      where: { id_requisicao: id },
      select: requisicaoSelect
    });
  }

  async findAll(filters?: RequisicaoFilters, skip?: number, take?: number): Promise<RequisicaoWithRelations[]> {
    return await this.prisma.requisicao.findMany({
      where: this.buildWhere(filters),
      skip: skip || 0,
      take: take || 50,
      orderBy: { data_requisicao: 'desc' },
      select: requisicaoSelect
    });
  }

  async count(filters?: RequisicaoFilters): Promise<number> {
    return await this.prisma.requisicao.count({ where: this.buildWhere(filters) });
  }

  async update(id: string, data: UpdateRequisicaoData): Promise<RequisicaoWithRelations> {
    return await this.prisma.requisicao.update({
      where: { id_requisicao: id },
      data: {
        status: data.status as any,
        mensagem: data.mensagem,
        contato_retorno: data.contato_retorno,
        observacoes: data.observacoes,
        data_resposta: data.data_resposta || new Date()
      },
      select: requisicaoSelect
    });
  }

  async delete(id: string): Promise<Requisicao> {
    return await this.prisma.requisicao.delete({
      where: { id_requisicao: id }
    });
  }

  async findBySolicitante(id_solicitante: string): Promise<RequisicaoWithRelations[]> {
    return await this.findAll({ id_solicitante }, 0, 100);
  }

  /** Requisições recebidas por um fazedor (serviços próprios ou modelos da sua agência), paginadas na BD. */
  async findByFazedor(id_fazedor: string, filters?: RequisicaoFilters, skip = 0, take = 50): Promise<RequisicaoWithRelations[]> {
    return await this.findAll({ ...filters, id_fazedor }, skip, take);
  }

  async countByFazedor(id_fazedor: string, filters?: RequisicaoFilters): Promise<number> {
    return await this.count({ ...filters, id_fazedor });
  }

  async updateStatus(id: string, status: string): Promise<RequisicaoWithRelations> {
    return await this.prisma.requisicao.update({
      where: { id_requisicao: id },
      data: {
        status: status as any,
        data_resposta: status !== 'pendente' ? new Date() : undefined
      },
      select: requisicaoSelect
    });
  }

  /** Estatísticas por status usando groupBy (sem carregar linhas). */
  async getEstatisticas(id_fazedor?: string, id_solicitante?: string): Promise<any> {
    const where: Prisma.RequisicaoWhereInput = {};

    if (id_fazedor) {
      Object.assign(where, whereRecebidas(id_fazedor));
    }

    if (id_solicitante) {
      where.id_solicitante = id_solicitante;
    }

    const grupos = await this.prisma.requisicao.groupBy({
      by: ['status'],
      where,
      _count: { _all: true }
    });

    const porStatus = (s: string) => grupos.find(g => g.status === s)?._count._all ?? 0;
    const total = grupos.reduce((sum, g) => sum + g._count._all, 0);
    const aceitas = porStatus('aceita');
    const concluidas = porStatus('concluida');

    return {
      total,
      pendentes: porStatus('pendente'),
      aceitas,
      recusadas: porStatus('recusada'),
      concluidas,
      canceladas: porStatus('cancelada'),
      taxa_aceitacao: total > 0 ? ((aceitas + concluidas) / total) * 100 : 0,
      taxa_conclusao: total > 0 ? (concluidas / total) * 100 : 0
    };
  }
}
