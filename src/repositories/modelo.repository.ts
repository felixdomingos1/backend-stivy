import { PrismaClient, Modelo, ModeloPortfolio, Prisma } from '@prisma/client';
import prisma from '../config/database';
import { usuarioPublicoSelect } from '../utils/prisma-selects';

/** Agência pública de um modelo (sem dados sensíveis do utilizador). */
const agenciaPublicaSelect = {
  id_agencia: true,
  nome_agencia: true,
  logo_url: true,
  fazedor: {
    select: {
      id_fazedor: true,
      id_usuario: true,
      cidade: true,
      usuario: { select: usuarioPublicoSelect }
    }
  }
} satisfies Prisma.AgenciaSelect;

export const modeloDetalheInclude = {
  agencia: { select: agenciaPublicaSelect },
  portfolio: { orderBy: { ordem: 'asc' as const } }
} satisfies Prisma.ModeloInclude;

export type ModeloWithRelations = Prisma.ModeloGetPayload<{ include: typeof modeloDetalheInclude }>;

export interface ModeloListFilters {
  status?: string;
  genero?: string;
  search?: string;
  id_agencia?: string;
}

export class ModeloRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /** `data` já deve vir sanitizado (allowlist) pelo serviço. */
  async create(data: Prisma.ModeloUncheckedCreateInput): Promise<Modelo> {
    return this.prisma.modelo.create({ data });
  }

  async findById(id_modelo: string): Promise<ModeloWithRelations | null> {
    return await this.prisma.modelo.findUnique({
      where: { id_modelo },
      include: modeloDetalheInclude
    });
  }

  private buildWhere(filters?: ModeloListFilters): Prisma.ModeloWhereInput {
    const where: Prisma.ModeloWhereInput = {};
    if (filters?.id_agencia) where.id_agencia = filters.id_agencia;
    if (filters?.status) where.status = filters.status as any;
    if (filters?.genero) where.genero = filters.genero as any;
    if (filters?.search) {
      where.OR = [
        { nome_completo: { contains: filters.search } },
        { nome_artistico: { contains: filters.search } }
      ];
    }
    return where;
  }

  async findMany(filters: ModeloListFilters, skip: number, take: number) {
    const where = this.buildWhere(filters);
    const [items, total] = await Promise.all([
      this.prisma.modelo.findMany({
        where,
        skip,
        take,
        include: {
          agencia: { select: agenciaPublicaSelect },
          portfolio: { take: 3, orderBy: { ordem: 'asc' } },
          _count: { select: { portfolio: true, requisicoes: true } }
        },
        orderBy: { data_cadastro: 'desc' }
      }),
      this.prisma.modelo.count({ where })
    ]);
    return { items, total };
  }

  async findByAgencia(id_agencia: string, filters?: ModeloListFilters): Promise<Modelo[]> {
    const { items } = await this.findMany({ ...filters, id_agencia }, 0, 200);
    return items;
  }

  async update(id_modelo: string, data: Prisma.ModeloUncheckedUpdateInput): Promise<Modelo> {
    return await this.prisma.modelo.update({
      where: { id_modelo },
      data
    });
  }

  async delete(id_modelo: string): Promise<Modelo> {
    return await this.prisma.modelo.delete({
      where: { id_modelo }
    });
  }

  async addFotoPortfolio(data: {
    id_modelo: string;
    imagem_url: string;
    imagem_public_id: string;
    titulo?: string;
    descricao?: string;
    categoria?: string;
    ordem: number;
  }): Promise<ModeloPortfolio> {
    return await this.prisma.modeloPortfolio.create({
      data
    });
  }

  async getFotosPortfolio(id_modelo: string): Promise<ModeloPortfolio[]> {
    return await this.prisma.modeloPortfolio.findMany({
      where: { id_modelo },
      orderBy: { ordem: 'asc' }
    });
  }

  async countFotosPortfolio(id_modelo: string): Promise<number> {
    return await this.prisma.modeloPortfolio.count({ where: { id_modelo } });
  }

  async findFotoPortfolio(id_modelo_portfolio: string): Promise<ModeloPortfolio | null> {
    return await this.prisma.modeloPortfolio.findUnique({ where: { id_modelo_portfolio } });
  }

  async deleteFotoPortfolio(id_modelo_portfolio: string): Promise<void> {
    await this.prisma.modeloPortfolio.delete({
      where: { id_modelo_portfolio }
    });
  }
}
