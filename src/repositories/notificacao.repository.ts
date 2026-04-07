import { PrismaClient, Notificacao } from '@prisma/client';
import prisma from '../config/database';

export interface CreateNotificacaoData {
  id_usuario: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  link?: string;
}

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

  async create(data: CreateNotificacaoData): Promise<Notificacao> {
    return await this.prisma.notificacao.create({
      data: {
        id_usuario: data.id_usuario,
        titulo: data.titulo,
        mensagem: data.mensagem,
        tipo: data.tipo as any,
        link: data.link,
        lida: false
      }
    });
  }

  async createMany(notificacoes: CreateNotificacaoData[]): Promise<number> {
    const result = await this.prisma.notificacao.createMany({
      data: notificacoes.map(n => ({
        id_usuario: n.id_usuario,
        titulo: n.titulo,
        mensagem: n.mensagem,
        tipo: n.tipo as any,
        link: n.link,
        lida: false
      }))
    });
    return result.count;
  }

  async findById(id: string): Promise<Notificacao | null> {
    return await this.prisma.notificacao.findUnique({
      where: { id_notificacao: id },
      include: {
        usuario: {
          select: {
            id_usuario: true,
            nome: true,
            email: true,
            foto_perfil: true
          }
        }
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
      orderBy: { data_envio: 'desc' }
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
      orderBy: { data_envio: 'desc' }
    });
  }

  async getUltimasNotificacoes(id_usuario: string, limit: number = 10): Promise<Notificacao[]> {
    return await this.prisma.notificacao.findMany({
      where: { id_usuario },
      orderBy: { data_envio: 'desc' },
      take: limit
    });
  }

  async enviarNotificacaoEvento(id_evento: string, ids_usuarios: string[], titulo: string, mensagem: string): Promise<void> {
    const notificacoes = ids_usuarios.map(id_usuario => ({
      id_usuario,
      titulo,
      mensagem,
      tipo: 'evento',
      link: `/eventos/${id_evento}`
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
      default:
        titulo = 'Atualização da Requisição';
        mensagem = `Sua requisição está com status: ${status}`;
    }

    await this.create({
      id_usuario,
      titulo,
      mensagem,
      tipo: 'requisicao',
      link: `/requisicoes/${id_requisicao}`
    });
  }

  async getEstatisticas(id_usuario: string): Promise<any> {
    const total = await this.countByUsuario(id_usuario);
    const naoLidas = await this.countByUsuario(id_usuario, false);
    const lidas = await this.countByUsuario(id_usuario, true);

    const ultimaSemana = new Date();
    ultimaSemana.setDate(ultimaSemana.getDate() - 7);

    const recentes = await this.prisma.notificacao.count({
      where: {
        id_usuario,
        data_envio: { gte: ultimaSemana }
      }
    });

    return {
      total,
      nao_lidas: naoLidas,
      lidas,
      ultima_semana: recentes,
      taxa_leitura: total > 0 ? (lidas / total) * 100 : 0
    };
  }
}
