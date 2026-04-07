import { PrismaClient } from '@prisma/client';
import prisma from '../config/database';

export class FazedorRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
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
        fotografo: true
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
}
