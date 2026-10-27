import { PrismaClient, Prisma } from '@prisma/client';
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
  midia_url?: string | null;
  id_resposta?: string | null;
}

/** Utilizador mínimo exposto no chat (nunca dados sensíveis). */
export const chatUsuarioSelect = {
  id_usuario: true,
  nome: true,
  foto_perfil: true,
} satisfies Prisma.UsuarioSelect;

export const mensagemSelect = {
  id_mensagem: true,
  id_conversa: true,
  id_remetente: true,
  conteudo: true,
  tipo: true,
  midia_url: true,
  lida: true,
  created_at: true,
  apagada: true,
  reacoes: true,
  id_resposta: true,
  remetente: { select: chatUsuarioSelect },
  resposta: {
    select: {
      id_mensagem: true,
      id_remetente: true,
      conteudo: true,
      tipo: true,
      midia_url: true,
      apagada: true,
      remetente: { select: { nome: true } },
    },
  },
} satisfies Prisma.MensagemSelect;

const participantesInclude = {
  participantes: {
    select: {
      id_usuario: true,
      ultima_leitura: true,
      joined_em: true,
      usuario: { select: { ...chatUsuarioSelect, tipo: true, fazedor: { select: { id_fazedor: true } } } },
    },
  },
} satisfies Prisma.ConversaInclude;

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
        ...participantesInclude,
        mensagens: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: mensagemSelect,
        },
      },
      orderBy: { atualizada_em: 'desc' },
      take: 200,
    });
  }

  /** Conta mensagens de outros utilizadores criadas depois da última leitura do participante. */
  async countUnread(id_conversa: string, id_usuario: string, ultima_leitura: Date | null): Promise<number> {
    return await this.prisma.mensagem.count({
      where: {
        id_conversa,
        id_remetente: { not: id_usuario },
        ...(ultima_leitura && { created_at: { gt: ultima_leitura } }),
      },
    });
  }

  async findConversationById(id_conversa: string) {
    return await this.prisma.conversa.findUnique({
      where: { id_conversa },
      include: participantesInclude,
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
      include: participantesInclude,
    });

    return conversations.find(
      (c) => c.participantes.length === participantsCount
    ) || null;
  }

  async countExistingUsers(ids: string[]): Promise<number> {
    return await this.prisma.usuario.count({
      where: { id_usuario: { in: ids }, status: 'ativo' },
    });
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
      include: participantesInclude,
    });
  }

  /** Mensagens anteriores a `before` (cursor), mais recentes primeiro (o serviço inverte). */
  async findMessagesByConversation(id_conversa: string, take: number, before?: Date) {
    return await this.prisma.mensagem.findMany({
      where: {
        id_conversa,
        ...(before && { created_at: { lt: before } }),
      },
      select: mensagemSelect,
      orderBy: [{ created_at: 'desc' }, { id_mensagem: 'desc' }],
      take,
    });
  }

  async createMessage(data: CreateMensagemData) {
    const [mensagem] = await this.prisma.$transaction([
      this.prisma.mensagem.create({
        data: {
          id_conversa: data.id_conversa,
          id_remetente: data.id_remetente,
          conteudo: data.conteudo,
          tipo: data.tipo || 'texto',
          midia_url: data.midia_url ?? null,
          id_resposta: data.id_resposta ?? null,
        },
        select: mensagemSelect,
      }),
      // Tocar a conversa para ordenar a lista por actividade
      this.prisma.conversa.update({
        where: { id_conversa: data.id_conversa },
        data: { atualizada_em: new Date() },
      }),
      // O remetente leu tudo até agora
      this.prisma.conversaParticipante.updateMany({
        where: { id_conversa: data.id_conversa, id_usuario: data.id_remetente },
        data: { ultima_leitura: new Date() },
      }),
    ]);
    return mensagem;
  }

  async findMessageById(id_mensagem: string) {
    return await this.prisma.mensagem.findUnique({ where: { id_mensagem }, select: mensagemSelect });
  }

  async updateMessage(id_mensagem: string, data: Prisma.MensagemUpdateInput) {
    return await this.prisma.mensagem.update({ where: { id_mensagem }, data, select: mensagemSelect });
  }

  /** Marca a conversa como lida pelo utilizador. Devolve a data de leitura e nº de mensagens marcadas. */
  async markAllAsRead(id_conversa: string, id_usuario: string) {
    const lida_em = new Date();
    const [, result] = await this.prisma.$transaction([
      this.prisma.conversaParticipante.updateMany({
        where: { id_conversa, id_usuario },
        data: { ultima_leitura: lida_em },
      }),
      this.prisma.mensagem.updateMany({
        where: {
          id_conversa,
          id_remetente: { not: id_usuario },
          lida: false,
        },
        data: { lida: true },
      }),
    ]);

    return { count: result.count, lida_em };
  }

  async getUnreadCount(id_usuario: string) {
    const participacoes = await this.prisma.conversaParticipante.findMany({
      where: { id_usuario },
      select: { id_conversa: true, ultima_leitura: true },
    });

    const counts = await Promise.all(
      participacoes.map(async (p) => ({
        id_conversa: p.id_conversa,
        quantidade: await this.countUnread(p.id_conversa, id_usuario, p.ultima_leitura),
      }))
    );

    const conversas = counts.filter((c) => c.quantidade > 0);
    const total = conversas.reduce((sum, c) => sum + c.quantidade, 0);

    return { total, total_conversas: conversas.length, conversas };
  }

  /** Remove o participante; se a conversa ficar vazia é apagada. */
  async leaveConversation(id_conversa: string, id_usuario: string): Promise<{ conversaApagada: boolean }> {
    return await this.prisma.$transaction(async (tx) => {
      await tx.conversaParticipante.deleteMany({ where: { id_conversa, id_usuario } });
      const restantes = await tx.conversaParticipante.count({ where: { id_conversa } });
      if (restantes === 0) {
        await tx.conversa.delete({ where: { id_conversa } });
        return { conversaApagada: true };
      }
      return { conversaApagada: false };
    });
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

  /** Contactos possíveis: seguindo ∪ seguidores ∪ clientes/fornecedores via requisições ∪ pesquisa por nome. */
  async findContatos(id_usuario: string, q?: string, limit = 50) {
    const nomeFiltro = q ? { nome: { contains: q } } : {};
    const usuarioSelect = {
      ...chatUsuarioSelect,
      tipo: true,
      status: true,
      fazedor: { select: { tipo_fazedor: true } },
    } satisfies Prisma.UsuarioSelect;

    const [seguindo, seguidores, clientes, fornecedores, sugestoes] = await Promise.all([
      this.prisma.seguidor.findMany({
        where: { id_seguidor_usuario: id_usuario, seguido: { status: 'ativo', ...nomeFiltro } },
        select: { seguido: { select: usuarioSelect } },
        orderBy: { data_inicio: 'desc' },
        take: limit,
      }),
      this.prisma.seguidor.findMany({
        where: { id_seguido: id_usuario, seguidor: { status: 'ativo', ...nomeFiltro } },
        select: { seguidor: { select: usuarioSelect } },
        orderBy: { data_inicio: 'desc' },
        take: limit,
      }),
      // Pessoas que me fizeram pedidos (sou o fazedor do serviço ou a agência do modelo)
      this.prisma.requisicao.findMany({
        where: {
          OR: [
            { servico: { fazedor: { id_usuario } } },
            { modelo: { agencia: { fazedor: { id_usuario } } } },
          ],
          solicitante: { status: 'ativo', ...nomeFiltro },
        },
        select: { solicitante: { select: usuarioSelect } },
        orderBy: { data_requisicao: 'desc' },
        take: limit,
      }),
      // Profissionais a quem eu fiz pedidos
      this.prisma.requisicao.findMany({
        where: { id_solicitante: id_usuario },
        select: {
          servico: { select: { fazedor: { select: { usuario: { select: usuarioSelect } } } } },
          modelo: { select: { agencia: { select: { fazedor: { select: { usuario: { select: usuarioSelect } } } } } } },
        },
        orderBy: { data_requisicao: 'desc' },
        take: limit,
      }),
      q
        ? this.prisma.usuario.findMany({
            where: { id_usuario: { not: id_usuario }, status: 'ativo', tipo: { not: 'sistem_admin' }, ...nomeFiltro },
            select: usuarioSelect,
            orderBy: { nome: 'asc' },
            take: limit,
          })
        : Promise.resolve([]),
    ]);

    const fornecedoresUsuarios = fornecedores
      .map((r) => r.servico?.fazedor.usuario ?? r.modelo?.agencia.fazedor.usuario)
      .filter((u): u is NonNullable<typeof u> => !!u && u.status === 'ativo')
      .filter((u) => !q || u.nome.toLowerCase().includes(q.toLowerCase()));

    return {
      seguindo: seguindo.map((s) => s.seguido),
      seguidores: seguidores.map((s) => s.seguidor),
      clientes: [...clientes.map((r) => r.solicitante), ...fornecedoresUsuarios],
      sugestoes,
    };
  }
}
