import { PrismaClient, Modelo, ModeloPortfolio, Prisma } from '@prisma/client';
import prisma from '../config/database';
import logger from '../utils/logger';

type ModeloWithRelations = Prisma.ModeloGetPayload<{
  include: {
    agencia: {
      include: {
        fazedor: {
          include: {
            usuario: true;
          };
        };
      };
    };
    portfolio: true;
    requisicoes: true;
  };
}>;

export class ModeloRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async create(data: any): Promise<any> {
    const mappedData: any = {
      id_agencia: data.id_agencia,
      nome_completo: data.nome_completo,
      nome_artistico: data.nome_artistico || null,
      genero: data.genero || 'feminino',
      altura: data.altura ? parseFloat(data.altura) : null,
      peso: data.peso ? parseFloat(data.peso) : null,
      busto: data.busto ? parseInt(data.busto) : null,
      cintura: data.cintura ? parseInt(data.cintura) : null,
      quadril: data.quadril ? parseInt(data.quadril) : null,
      sapato: data.sapato ? parseInt(data.sapato) : null,
      roupa: data.roupa ? parseInt(data.roupa) : null,
      cabelo: data.cabelo || null,
      olhos: data.olhos || null,
      foto_url: data.foto_url || null,
      foto_public_id: data.foto_public_id || null,
      status: data.status || 'ativo',
      experiencia: data.experiencia || null,
      idade: data.idade ? parseInt(data.idade) : null,
      nacionalidade: data.nacionalidade || null,
      habilidades: data.habilidades || null,
      redes_sociais: data.redes_sociais || null,
    };
    Object.keys(mappedData).forEach(key => {
      if (mappedData[key] === undefined || mappedData[key] === null) {
        delete mappedData[key];
      }
    });
    logger.info('📦 Prisma create data:', mappedData);
    return this.prisma.modelo.create({
      data: mappedData,
    });
  }
  async findById(id_modelo: string): Promise<ModeloWithRelations | null> {
    return await this.prisma.modelo.findUnique({
      where: { id_modelo },
      include: {
        agencia: {
          include: {
            fazedor: {
              include: {
                usuario: true
              }
            }
          }
        },
        portfolio: {
          orderBy: { ordem: 'asc' }
        },
        requisicoes: {
          take: 5,
          orderBy: { data_requisicao: 'desc' }
        }
      }
    });
  }

  async findByAgencia(id_agencia: string, filters?: {
    status?: string;
    genero?: string;
    search?: string;
  }): Promise<Modelo[]> {
    const where: any = { id_agencia };

    if (filters?.status) where.status = filters.status;
    if (filters?.genero) where.genero = filters.genero;
    if (filters?.search) {
      where.OR = [
        { nome_completo: { contains: filters.search } },
        { nome_artistico: { contains: filters.search } }
      ];
    }

    return await this.prisma.modelo.findMany({
      where,
      include: {
        portfolio: {
          take: 3,
          orderBy: { ordem: 'asc' }
        }
      },
      orderBy: { data_cadastro: 'desc' }
    });
  }


  async update(id_modelo: string, data: any): Promise<Modelo> {
    const cleanData: any = {};
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        cleanData[key] = data[key];
      }
    });

    return await this.prisma.modelo.update({
      where: { id_modelo },
      data: cleanData
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

  async deleteFotoPortfolio(id_modelo_portfolio: string): Promise<void> {
    await this.prisma.modeloPortfolio.delete({
      where: { id_modelo_portfolio }
    });
  }
}
