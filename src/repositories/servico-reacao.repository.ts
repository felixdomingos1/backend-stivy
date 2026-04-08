import { PrismaClient, ReacaoTipo } from '@prisma/client';
import prisma from '../config/database';

export class ServicoReacaoRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async addReacao(data: {
    id_servico: string;
    id_usuario: string;
    tipo: ReacaoTipo;
  }): Promise<void> {
    await this.prisma.servicoReacao.upsert({
      where: {
        id_servico_id_usuario: {
          id_servico: data.id_servico,
          id_usuario: data.id_usuario
        }
      },
      update: { tipo: data.tipo },
      create: data
    });
  }

  async removeReacao(id_servico: string, id_usuario: string): Promise<void> {
    await this.prisma.servicoReacao.delete({
      where: {
        id_servico_id_usuario: {
          id_servico,
          id_usuario
        }
      }
    });
  }

  async getReacoesCount(id_servico: string): Promise<Record<ReacaoTipo, number>> {
    const reacoes = await this.prisma.servicoReacao.groupBy({
      by: ['tipo'],
      where: { id_servico },
      _count: { tipo: true }
    });

    const result: any = {
      like: 0,
      love: 0,
      wow: 0,
      sad: 0,
      angry: 0
    };

    reacoes.forEach(r => {
      result[r.tipo] = r._count.tipo;
    });

    return result;
  }

  async getUserReacao(id_servico: string, id_usuario: string): Promise<string | null> {
    const reacao = await this.prisma.servicoReacao.findUnique({
      where: {
        id_servico_id_usuario: {
          id_servico,
          id_usuario
        }
      }
    });

    return reacao?.tipo || null;
  }
}
