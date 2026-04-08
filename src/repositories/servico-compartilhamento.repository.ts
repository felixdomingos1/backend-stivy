import { PrismaClient } from '@prisma/client';
import prisma from '../config/database';

export class ServicoCompartilhamentoRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async create(data: {
    id_servico: string;
    id_usuario: string;
    plataforma?: string;
  }): Promise<any> {
    const link_compartilhado = `${process.env.BASE_URL || 'http://localhost:3000'}/servico/${data.id_servico}`;

    return await this.prisma.servicoCompartilhamento.create({
      data: {
        id_servico: data.id_servico,
        id_usuario: data.id_usuario,
        plataforma: data.plataforma,
        link_compartilhado
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
    compartilhamentos: any[];
    total: number;
  }> {
    const skip = (page - 1) * limit;

    const [compartilhamentos, total] = await Promise.all([
      this.prisma.servicoCompartilhamento.findMany({
        where: { id_servico },
        include: {
          usuario: {
            select: {
              id_usuario: true,
              nome: true,
              foto_perfil: true
            }
          }
        },
        orderBy: { data_compartilhamento: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.servicoCompartilhamento.count({
        where: { id_servico }
      })
    ]);

    return { compartilhamentos, total };
  }

  async getCountByServico(id_servico: string): Promise<number> {
    return await this.prisma.servicoCompartilhamento.count({
      where: { id_servico }
    });
  }
}
