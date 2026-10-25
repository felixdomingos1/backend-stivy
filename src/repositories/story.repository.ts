import { PrismaClient, Story, StoryTipo } from '@prisma/client';
import prisma from '../config/database';
import { usuarioPublicoSelect } from '../utils/prisma-selects';

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

  async findActiveByUsuario(id_usuario: string): Promise<any[]> {
    return await this.prisma.story.findMany({
      where: {
        id_usuario,
        expira_em: { gt: new Date() }
      },
      include: {
        _count: { select: { visualizacoes: true, curtidas: true, comentarios: true } }
      },
      orderBy: { data_criacao: 'desc' }
    });
  }

  /**
   * Stories activos. Para cada story devolve contagens e (se `viewerId`) apenas as linhas
   * do próprio visualizador — nunca a lista completa de quem viu/curtiu.
   */
  async findActiveStories(limit: number = 50, viewerId?: string): Promise<any[]> {
    return await this.prisma.story.findMany({
      where: {
        expira_em: { gt: new Date() }
      },
      include: {
        usuario: { select: usuarioPublicoSelect },
        _count: { select: { visualizacoes: true, curtidas: true, comentarios: true } },
        visualizacoes: {
          where: { id_usuario: viewerId ?? '__none__' },
          select: { id_usuario: true }
        },
        curtidas: {
          where: { id_usuario: viewerId ?? '__none__' },
          select: { id_usuario: true }
        }
      },
      orderBy: { data_criacao: 'desc' },
      take: limit
    });
  }

  async findById(id_story: string): Promise<Story | null> {
    return await this.prisma.story.findUnique({
      where: { id_story }
    });
  }

  /** Lista completa de quem viu/curtiu (apenas para o dono do story). */
  async findViewers(id_story: string): Promise<any> {
    return await this.prisma.story.findUnique({
      where: { id_story },
      select: {
        id_story: true,
        id_usuario: true,
        visualizacoes: {
          orderBy: { data_visualizacao: 'desc' },
          select: { data_visualizacao: true, usuario: { select: usuarioPublicoSelect } }
        },
        curtidas: {
          orderBy: { data_curtida: 'desc' },
          select: { data_curtida: true, usuario: { select: usuarioPublicoSelect } }
        }
      }
    });
  }

  async findExpired(limit: number = 500): Promise<Story[]> {
    return await this.prisma.story.findMany({
      where: { expira_em: { lt: new Date() } },
      take: limit
    });
  }

  async deleteByIds(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await this.prisma.story.deleteMany({ where: { id_story: { in: ids } } });
    return result.count;
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

  async addComentario(id_story: string, id_usuario: string, comentario: string): Promise<any> {
    return await this.prisma.storyComentario.create({
      data: { id_story, id_usuario, comentario },
      include: { usuario: { select: usuarioPublicoSelect } }
    });
  }

  /** Comentários de um story, do mais antigo para o mais recente. */
  async findComentarios(id_story: string, limit: number = 100): Promise<any[]> {
    return await this.prisma.storyComentario.findMany({
      where: { id_story },
      include: { usuario: { select: usuarioPublicoSelect } },
      orderBy: { data_criacao: 'asc' },
      take: limit
    });
  }

  async findComentarioById(id_comentario: string): Promise<any> {
    return await this.prisma.storyComentario.findUnique({
      where: { id_comentario },
      include: { story: { select: { id_usuario: true } } }
    });
  }

  async deleteComentario(id_comentario: string): Promise<void> {
    await this.prisma.storyComentario.delete({ where: { id_comentario } });
  }

  async removeCurtida(id_story: string, id_usuario: string): Promise<void> {
    await this.prisma.storyCurtida.deleteMany({
      where: { id_story, id_usuario }
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
