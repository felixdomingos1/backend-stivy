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

  async reorder(_: string, ids: string[]): Promise<void> {
    for (let i = 0; i < ids.length; i++) {
      await this.prisma.portfolio.update({
        where: { id_portfolio: ids[i] },
        data: { ordem: i }
      });
    }
  }
}
