import { PrismaClient } from '@prisma/client';
import prisma from '../config/database';

export class ModeloRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async findById(id: string): Promise<any> {
    return await this.prisma.modelo.findUnique({
      where: { id_modelo: id },
      include: {
        agencia: {
          include: {
            fazedor: {
              include: {
                usuario: true
              }
            }
          }
        }
      }
    });
  }
}
