import { DenunciaMotivo, PrismaClient } from '@prisma/client';
import prisma from '../config/database';

export class ServicoDenunciaRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /** Uma denúncia por utilizador e serviço: denunciar de novo actualiza o motivo e volta a pendente. */
  async upsert(data: {
    id_servico: string;
    id_usuario: string;
    motivo: DenunciaMotivo;
    descricao?: string;
  }): Promise<any> {
    return await this.prisma.servicoDenuncia.upsert({
      where: {
        id_servico_id_usuario: { id_servico: data.id_servico, id_usuario: data.id_usuario }
      },
      create: data,
      update: {
        motivo: data.motivo,
        descricao: data.descricao ?? null,
        status: 'pendente',
        data_revisao: null
      }
    });
  }
}
