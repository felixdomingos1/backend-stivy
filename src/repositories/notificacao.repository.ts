import { PrismaClient, Notificacao } from '@prisma/client';
import prisma from '../config/database';
import { randomUUID } from 'crypto';
import { emitToUser } from '../config/socket';
import logger from '../utils/logger';

/** Evento Socket.IO emitido para `user:<id_destino>` sempre que se cria uma notificação. */
export const NOTIFICATION_SOCKET_EVENT = 'notification:new';

const emitNotificacao = (notificacao: Notificacao & { ator?: any }): void => {
  try {
    emitToUser(notificacao.id_usuario, NOTIFICATION_SOCKET_EVENT, notificacao);
  } catch (error) {
    logger.warn('[NOTIFICACAO] Falha ao emitir notificação via socket:', error);
  }
};

export interface CreateNotificacaoData {
  id_usuario: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  link?: string;
  /** Utilizador que originou a notificação (quem comentou, reagiu, pediu...). */
  id_ator?: string | null;
}

const atorSelect = { select: { id_usuario: true, nome: true, foto_perfil: true } } as const;
const notificacaoInclude = { ator: atorSelect } as const;

export interface NotificacaoFilters {
  tipo?: string;
  lida?: boolean;
  data_inicio?: Date;
  data_fim?: Date;
}

export class NotificacaoRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /** Cria a notificação e emite `notification:new` para o destinatário (ponto central). */
  async create(data: CreateNotificacaoData): Promise<Notificacao> {
    const notificacao = await this.prisma.notificacao.create({
      data: {
        id_usuario: data.id_usuario,
        titulo: data.titulo.slice(0, 100),
        mensagem: data.mensagem,
        tipo: data.tipo as any,
        link: data.link,
        id_ator: data.id_ator ?? null,
        lida: false
      },
      include: notificacaoInclude
    });
    emitNotificacao(notificacao);
    return notificacao;
  }

  /** Criação em lote (uma query) + emissão socket para cada destinatário. */
  async createMany(notificacoes: CreateNotificacaoData[]): Promise<number> {
    if (notificacoes.length === 0) return 0;
    const agora = new Date();
    const rows: Notificacao[] = notificacoes.map(n => ({
      id_notificacao: randomUUID(),
      id_usuario: n.id_usuario,
      titulo: n.titulo.slice(0, 100),
      mensagem: n.mensagem,
      tipo: n.tipo as any,
      link: n.link ?? null,
      id_ator: n.id_ator ?? null,
      lida: false,
      data_envio: agora
    }));
    const result = await this.prisma.notificacao.createMany({ data: rows });
    const idsAtores = [...new Set(rows.map(r => r.id_ator).filter((id): id is string => !!id))];
    const atores = idsAtores.length > 0
      ? await this.prisma.usuario.findMany({ where: { id_usuario: { in: idsAtores } }, ...atorSelect })
      : [];
    rows.forEach(r => emitNotificacao({ ...r, ator: atores.find(a => a.id_usuario === r.id_ator) ?? null }));
    return result.count;
  }

  /** Cria uma notificação sem nunca lançar erro (para efeitos secundários). */
  async createSafe(data: CreateNotificacaoData): Promise<Notificacao | null> {
    try {
      return await this.create(data);
    } catch (error) {
      logger.error('[NOTIFICACAO] Falha ao criar notificação (ignorada):', error);
      return null;
    }
  }

  async findById(id: string): Promise<Notificacao | null> {
    return await this.prisma.notificacao.findUnique({
      where: { id_notificacao: id },
      include: {
        usuario: {
          select: {
            id_usuario: true,
            nome: true,
            foto_perfil: true
          }
        },
        ator: atorSelect
      }
    });
  }

  async findByUsuario(id_usuario: string, filters?: NotificacaoFilters, skip?: number, take?: number): Promise<Notificacao[]> {
    const where: any = { id_usuario };

    if (filters?.tipo) {
      where.tipo = filters.tipo;
    }

    if (filters?.lida !== undefined) {
      where.lida = filters.lida;
    }

    if (filters?.data_inicio || filters?.data_fim) {
      where.data_envio = {};
      if (filters.data_inicio) {
        where.data_envio.gte = filters.data_inicio;
      }
      if (filters.data_fim) {
        where.data_envio.lte = filters.data_fim;
      }
    }

    return await this.prisma.notificacao.findMany({
      where,
      skip: skip || 0,
      take: take || 50,
      orderBy: { data_envio: 'desc' },
      include: notificacaoInclude
    });
  }

  async countByUsuario(id_usuario: string, lida?: boolean): Promise<number> {
    const where: any = { id_usuario };
    if (lida !== undefined) {
      where.lida = lida;
    }
    return await this.prisma.notificacao.count({ where });
  }

  async markAsRead(id: string): Promise<Notificacao> {
    return await this.prisma.notificacao.update({
      where: { id_notificacao: id },
      data: { lida: true }
    });
  }

  async markAllAsRead(id_usuario: string): Promise<number> {
    const result = await this.prisma.notificacao.updateMany({
      where: {
        id_usuario,
        lida: false
      },
      data: { lida: true }
    });
    return result.count;
  }

  async delete(id: string): Promise<Notificacao> {
    return await this.prisma.notificacao.delete({
      where: { id_notificacao: id }
    });
  }

  async deleteAllByUsuario(id_usuario: string): Promise<number> {
    const result = await this.prisma.notificacao.deleteMany({ where: { id_usuario } });
    return result.count;
  }

  async deleteOld(usuarioId?: string, daysOld: number = 30): Promise<number> {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - daysOld);

    const where: any = {
      data_envio: { lt: dateLimit },
      lida: true
    };

    if (usuarioId) {
      where.id_usuario = usuarioId;
    }

    const result = await this.prisma.notificacao.deleteMany({ where });
    return result.count;
  }

  async getNaoLidas(id_usuario: string): Promise<Notificacao[]> {
    return await this.prisma.notificacao.findMany({
      where: {
        id_usuario,
        lida: false
      },
      orderBy: { data_envio: 'desc' },
      take: 100,
      include: notificacaoInclude
    });
  }

  async getUltimasNotificacoes(id_usuario: string, limit: number = 10): Promise<Notificacao[]> {
    return await this.prisma.notificacao.findMany({
      where: { id_usuario },
      orderBy: { data_envio: 'desc' },
      take: Math.min(Math.max(limit || 10, 1), 100),
      include: notificacaoInclude
    });
  }

  async enviarNotificacaoEvento(id_evento: string, ids_usuarios: string[], titulo: string, mensagem: string): Promise<void> {
    const notificacoes = ids_usuarios.map(id_usuario => ({
      id_usuario,
      titulo,
      mensagem,
      tipo: 'evento',
      link: `/evento/${id_evento}`
    }));
    await this.createMany(notificacoes);
  }

  async enviarNotificacaoRequisicao(id_requisicao: string, id_usuario: string, status: string): Promise<void> {
    let titulo = '';
    let mensagem = '';

    switch (status) {
      case 'aceita':
        titulo = 'Requisição Aceita!';
        mensagem = 'Sua requisição foi aceita. Aguarde o contato do profissional.';
        break;
      case 'recusada':
        titulo = 'Requisição Recusada';
        mensagem = 'Infelizmente sua requisição foi recusada.';
        break;
      case 'concluida':
        titulo = 'Requisição Concluída';
        mensagem = 'Sua requisição foi concluída com sucesso!';
        break;
      case 'nova':
        titulo = 'Nova requisição';
        mensagem = 'Recebeu um novo pedido de contratação.';
        break;
      case 'cancelada':
        titulo = 'Requisição cancelada';
        mensagem = 'Um pedido de contratação foi cancelado pelo cliente.';
        break;
      default:
        titulo = 'Atualização da Requisição';
        mensagem = `Sua requisição está com status: ${status}`;
    }

    await this.create({
      id_usuario,
      titulo,
      mensagem,
      tipo: 'requisicao',
      link: `/requisicao/${id_requisicao}`
    });
  }

  async getEstatisticas(id_usuario: string): Promise<any> {
    const ultimaSemana = new Date();
    ultimaSemana.setDate(ultimaSemana.getDate() - 7);

    const [total, naoLidas, recentes] = await Promise.all([
      this.countByUsuario(id_usuario),
      this.countByUsuario(id_usuario, false),
      this.prisma.notificacao.count({
        where: {
          id_usuario,
          data_envio: { gte: ultimaSemana }
        }
      })
    ]);
    const lidas = total - naoLidas;

    return {
      total,
      nao_lidas: naoLidas,
      lidas,
      ultima_semana: recentes,
      taxa_leitura: total > 0 ? (lidas / total) * 100 : 0
    };
  }
}
