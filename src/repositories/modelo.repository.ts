import { PrismaClient, Modelo, ModeloPortfolio, Prisma } from '@prisma/client';
import prisma from '../config/database';

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

  async create(data: {
    id_agencia: string;
    nome_completo: string;
    nome_artistico?: string;
    genero?: string;
    altura?: number;
    peso?: number;
    busto?: number;
    cintura?: number;
    quadril?: number;
    sapato?: number;
    roupa?: number;
    cabelo?: string;
    olhos?: string;
    experiencia?: string;
    idade?: number;
    nacionalidade?: string;
    habilidades?: string;
    redes_sociais?: any;
  }): Promise<Modelo> {
    return await this.prisma.modelo.create({
      data: {
        id_agencia: data.id_agencia,
        nome_completo: data.nome_completo,
        nome_artistico: data.nome_artistico,
        genero: data.genero as any,
        altura: data.altura,
        peso: data.peso,
        busto: data.busto,
        cintura: data.cintura,
        quadril: data.quadril,
        sapato: data.sapato,
        roupa: data.roupa,
        cabelo: data.cabelo,
        olhos: data.olhos,
        experiencia: data.experiencia,
        idade: data.idade,
        nacionalidade: data.nacionalidade,
        habilidades: data.habilidades,
        redes_sociais: data.redes_sociais
      }
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
