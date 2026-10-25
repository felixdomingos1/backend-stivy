import { PrismaClient, Portfolio } from '@prisma/client';
import prisma from '../config/database';

export class PortfolioRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async create(data: {
    id_fazedor: string;
    titulo?: string;
    descricao?: string;
    imagem_url: string;
    imagem_public_id: string;
    ordem: number;
  }): Promise<Portfolio> {
    return await this.prisma.portfolio.create({ data });
  }

  async findByFazedor(id_fazedor: string): Promise<Portfolio[]> {
    return await this.prisma.portfolio.findMany({
      where: { id_fazedor },
      orderBy: { ordem: 'asc' }
    });
  }

  async update(id_portfolio: string, data: Partial<Portfolio>): Promise<Portfolio> {
    return await this.prisma.portfolio.update({
      where: { id_portfolio },
      data
    });
  }

  async delete(id_portfolio: string): Promise<Portfolio> {
    return await this.prisma.portfolio.delete({
      where: { id_portfolio }
    });
  }

  async deleteByFazedor(id_fazedor: string): Promise<number> {
    const result = await this.prisma.portfolio.deleteMany({
      where: { id_fazedor }
    });
    return result.count;
  }

  /** Reordena apenas imagens do próprio fazedor (ids de terceiros são ignorados). Devolve nº actualizado. */
  async reorder(id_fazedor: string, ids: string[]): Promise<number> {
    const results = await this.prisma.$transaction(
      ids.map((id_portfolio, i) =>
        this.prisma.portfolio.updateMany({
          where: { id_portfolio, id_fazedor },
          data: { ordem: i }
        })
      )
    );
    return results.reduce((sum, r) => sum + r.count, 0);
  }

  async findOneByFazedor(id_portfolio: string, id_fazedor: string): Promise<Portfolio | null> {
    return await this.prisma.portfolio.findFirst({ where: { id_portfolio, id_fazedor } });
  }
}
