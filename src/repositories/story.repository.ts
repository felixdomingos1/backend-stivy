// src/repositories/story.repository.ts
import { PrismaClient, Story, StoryTipo } from '@prisma/client';
import prisma from '../config/database';

export class StoryRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async create(data: {
    id_usuario: string;
    midia_url: string;
    midia_public_id: string;
    tipo: StoryTipo;
    duracao?: number;
    texto?: string;
    cor_fundo?: string;
    expira_em: Date;
  }): Promise<Story> {
    return await this.prisma.story.create({ data });
  }

  async findActiveByUsuario(id_usuario: string): Promise<Story[]> {
    return await this.prisma.story.findMany({
      where: {
        id_usuario,
        expira_em: { gt: new Date() }
      },
      orderBy: { data_criacao: 'desc' }
    });
  }

  async findActiveStories(limit: number = 50): Promise<any[]> {
    return await this.prisma.story.findMany({
      where: {
        expira_em: { gt: new Date() }
      },
      include: {
        usuario: {
          select: {
            id_usuario: true,
            nome: true,
            foto_perfil: true
          }
        },
        visualizacoes: true,
        curtidas: true
      },
      orderBy: { data_criacao: 'desc' },
      take: limit
    });
  }

  async findById(id_story: string): Promise<Story | null> {
    return await this.prisma.story.findUnique({
      where: { id_story },
      include: {
        usuario: {
          select: {
            id_usuario: true,
            nome: true,
            foto_perfil: true
          }
        },
        visualizacoes: {
          include: {
            usuario: {
              select: {
                id_usuario: true,
                nome: true,
                foto_perfil: true
              }
            }
          }
        },
        curtidas: {
          include: {
            usuario: {
              select: {
                id_usuario: true,
                nome: true,
                foto_perfil: true
              }
            }
          }
        }
      }
    });
  }

  async addVisualizacao(id_story: string, id_usuario: string): Promise<void> {
    await this.prisma.storyVisualizacao.upsert({
      where: {
        id_story_id_usuario: {
          id_story,
          id_usuario
        }
      },
      update: {},
      create: {
        id_story,
        id_usuario
      }
    });
  }

  async addCurtida(id_story: string, id_usuario: string): Promise<void> {
    await this.prisma.storyCurtida.upsert({
      where: {
        id_story_id_usuario: {
          id_story,
          id_usuario
        }
      },
      update: {},
      create: {
        id_story,
        id_usuario
      }
    });
  }

  async removeCurtida(id_story: string, id_usuario: string): Promise<void> {
    await this.prisma.storyCurtida.delete({
      where: {
        id_story_id_usuario: {
          id_story,
          id_usuario
        }
      }
    });
  }

  async deleteExpiredStories(): Promise<number> {
    const result = await this.prisma.story.deleteMany({
      where: {
        expira_em: { lt: new Date() }
      }
    });
    return result.count;
  }

  async delete(id_story: string): Promise<Story> {
    return await this.prisma.story.delete({
      where: { id_story }
    });
  }
}
