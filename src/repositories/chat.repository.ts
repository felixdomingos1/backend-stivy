import { PrismaClient } from '@prisma/client';
import prisma from '../config/database';

export interface CreateConversaData {
  tipo: 'direct' | 'grupo';
  titulo?: string;
  participantes: string[];
}

export interface CreateMensagemData {
  id_conversa: string;
  id_remetente: string;
  conteudo: string;
  tipo?: string;
}

export class ChatRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async findConversationsByUser(id_usuario: string) {
    return await this.prisma.conversa.findMany({
      where: {
        participantes: {
          some: { id_usuario },
        },
      },
      include: {
        participantes: {
          include: {
            usuario: {
              select: {
                id_usuario: true,
                nome: true,
                foto_perfil: true,
              },
            },
          },
        },
        mensagens: {
          orderBy: { created_at: 'desc' },
          take: 1,
          include: {
            remetente: {
              select: {
                id_usuario: true,
                nome: true,
                foto_perfil: true,
              },
            },
          },
        },
      },
      orderBy: { atualizada_em: 'desc' },
    });
  }

  async findConversationById(id_conversa: string) {
    return await this.prisma.conversa.findUnique({
      where: { id_conversa },
      include: {
        participantes: {
          include: {
            usuario: {
              select: {
                id_usuario: true,
                nome: true,
                foto_perfil: true,
              },
            },
          },
        },
      },
    });
  }

  async findExistingDirectConversation(ids_usuarios: string[]) {
    const participantsCount = ids_usuarios.length;

    const conversations = await this.prisma.conversa.findMany({
      where: {
        tipo: 'direct',
        AND: ids_usuarios.map((id) => ({
          participantes: {
            some: { id_usuario: id },
          },
        })),
      },
      include: {
        participantes: {
          include: {
            usuario: {
              select: {
                id_usuario: true,
                nome: true,
                foto_perfil: true,
              },
            },
          },
        },
      },
    });

    return conversations.find(
      (c) => c.participantes.length === participantsCount
    ) || null;
  }

  async createConversation(data: CreateConversaData) {
    return await this.prisma.conversa.create({
      data: {
        tipo: data.tipo,
        titulo: data.titulo,
        participantes: {
          create: data.participantes.map((id_usuario) => ({
            id_usuario,
          })),
        },
      },
      include: {
        participantes: {
          include: {
            usuario: {
              select: {
                id_usuario: true,
                nome: true,
                foto_perfil: true,
              },
            },
          },
        },
      },
    });
  }

  async findMessagesByConversation(
    id_conversa: string,
    skip: number,
    take: number
  ) {
    const [messages, total] = await Promise.all([
      this.prisma.mensagem.findMany({
        where: { id_conversa },
        include: {
          remetente: {
            select: {
              id_usuario: true,
              nome: true,
              foto_perfil: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take,
      }),
      this.prisma.mensagem.count({
        where: { id_conversa },
      }),
    ]);

    return { messages, total };
  }

  async createMessage(data: CreateMensagemData) {
    return await this.prisma.mensagem.create({
      data: {
        id_conversa: data.id_conversa,
        id_remetente: data.id_remetente,
        conteudo: data.conteudo,
        tipo: data.tipo || 'texto',
      },
      include: {
        remetente: {
          select: {
            id_usuario: true,
            nome: true,
            foto_perfil: true,
          },
        },
      },
    });
  }

  async markMessageAsRead(id_mensagem: string, id_usuario: string) {
    const message = await this.prisma.mensagem.findUnique({
      where: { id_mensagem },
    });

    if (!message) return null;

    await this.prisma.conversaParticipante.updateMany({
      where: {
        id_conversa: message.id_conversa,
        id_usuario,
      },
      data: { ultima_leitura: new Date() },
    });

    return await this.prisma.mensagem.update({
      where: { id_mensagem },
      data: { lida: true },
    });
  }

  async markAllAsRead(id_conversa: string, id_usuario: string) {
    await this.prisma.conversaParticipante.updateMany({
      where: {
        id_conversa,
        id_usuario,
      },
      data: { ultima_leitura: new Date() },
    });

    const result = await this.prisma.mensagem.updateMany({
      where: {
        id_conversa,
        id_remetente: { not: id_usuario },
        lida: false,
      },
      data: { lida: true },
    });

    return result.count;
  }

  async getUnreadCount(id_usuario: string) {
    const conversations = await this.prisma.conversa.findMany({
      where: {
        participantes: {
          some: { id_usuario },
        },
      },
      select: {
        id_conversa: true,
        mensagens: {
          where: {
            lida: false,
            id_remetente: { not: id_usuario },
          },
          select: { id_mensagem: true },
        },
      },
    });

    const total = conversations.reduce(
      (sum, c) => sum + c.mensagens.length,
      0
    );

    const conversas = conversations
      .filter((c) => c.mensagens.length > 0)
      .map((c) => ({
        id_conversa: c.id_conversa,
        quantidade: c.mensagens.length,
      }));

    return { total, conversas };
  }

  async deleteConversation(id_conversa: string) {
    return await this.prisma.conversa.delete({
      where: { id_conversa },
    });
  }

  async findParticipantByConversation(id_conversa: string, id_usuario: string) {
    return await this.prisma.conversaParticipante.findUnique({
      where: {
        id_conversa_id_usuario: {
          id_conversa,
          id_usuario,
        },
      },
    });
  }
}
