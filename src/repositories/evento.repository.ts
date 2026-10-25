import { PrismaClient, Evento, Prisma } from '@prisma/client';
import prisma from '../config/database';
import { usuarioPublicoSelect } from '../utils/prisma-selects';

export interface CreateEventoData {
  id_organizador: string;
  titulo: string;
  descricao?: string;
  local?: string;
  latitude?: number;
  longitude?: number;
  data_inicio: Date;
  data_fim: Date;
  tipo_evento: string;
  imagem_url?: string;
  imagem_public_id?: string;
  banner_url?: string;
  banner_public_id?: string;
  imagens?: {
    imagem_url: string;
    imagem_public_id: string;
    ordem: number;
    legenda?: string;
  }[];
  valor_ingresso?: number;
}

export interface UpdateEventoData {
  titulo?: string;
  descricao?: string;
  local?: string;
  latitude?: number | null;
  longitude?: number | null;
  data_inicio?: Date;
  data_fim?: Date;
  tipo_evento?: string;
  imagem_url?: string;
  status?: string;
  valor_ingresso?: number;
}

export interface EventoFilters {
  tipo?: string;
  status?: string;
  id_organizador?: string;
  data_inicio?: Date;
  data_fim?: Date;
  search?: string;
  proximos?: boolean;
}

/** Include padrão de evento: organizador com utilizador público + contagem de participantes. */
export const eventoInclude = (viewerId?: string) => ({
  imagens: {
    orderBy: { ordem: 'asc' as const }
  },
  organizador: {
    select: {
      id_fazedor: true,
      id_usuario: true,
      tipo_fazedor: true,
      usuario: { select: usuarioPublicoSelect }
    }
  },
  _count: { select: { participantes: true } },
  // Apenas a linha do próprio utilizador (para calcular eu_participo)
  participantes: {
    where: { id_usuario: viewerId ?? '__none__' },
    select: { id_usuario: true }
  }
}) satisfies Prisma.EventoInclude;

export class EventoRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  private buildWhere(filters?: EventoFilters): Prisma.EventoWhereInput {
    const where: Prisma.EventoWhereInput = {};

    if (filters?.tipo) {
      where.tipo_evento = filters.tipo as any;
    }

    if (filters?.status) {
      where.status = filters.status as any;
    }

    if (filters?.id_organizador) {
      where.id_organizador = filters.id_organizador;
    }

    if (filters?.proximos) {
      where.data_fim = { gte: new Date() };
      where.status = 'ativo';
    }

    if (filters?.data_inicio || filters?.data_fim) {
      where.data_inicio = {
        ...(filters.data_inicio && { gte: filters.data_inicio }),
        ...(filters.data_fim && { lte: filters.data_fim }),
      };
    }

    if (filters?.search) {
      where.OR = [
        { titulo: { contains: filters.search } },
        { descricao: { contains: filters.search } },
        { local: { contains: filters.search } }
      ];
    }

    return where;
  }

  async create(data: CreateEventoData): Promise<Evento> {
    return await this.prisma.evento.create({
      data: {
        id_organizador: data.id_organizador,
        titulo: data.titulo,
        descricao: data.descricao,
        local: data.local,
        latitude: data.latitude,
        longitude: data.longitude,
        data_inicio: data.data_inicio,
        data_fim: data.data_fim,
        tipo_evento: data.tipo_evento as any,
        imagem_url: data.imagem_url,
        imagem_public_id: data.imagem_public_id,
        banner_url: data.banner_url,
        banner_public_id: data.banner_public_id,
        ...(data.imagens && data.imagens.length > 0 && {
          imagens: {
            create: data.imagens.map((img, index) => ({
              imagem_url: img.imagem_url,
              imagem_public_id: img.imagem_public_id,
              ordem: img.ordem ?? index,
              legenda: img.legenda
            }))
          }
        }),
        valor_ingresso: data.valor_ingresso || 0,
        status: 'ativo'
      },
      include: eventoInclude()
    });
  }

  async findById(id: string, viewerId?: string) {
    return await this.prisma.evento.findUnique({
      where: { id_evento: id },
      include: eventoInclude(viewerId)
    });
  }

  async findAll(filters?: EventoFilters, skip?: number, take?: number, viewerId?: string) {
    return await this.prisma.evento.findMany({
      where: this.buildWhere(filters),
      skip: skip || 0,
      take: take || 50,
      orderBy: { data_inicio: 'asc' },
      include: eventoInclude(viewerId)
    });
  }

  async count(filters?: EventoFilters): Promise<number> {
    return await this.prisma.evento.count({ where: this.buildWhere(filters) });
  }

  /** Eventos activos não terminados dentro de uma caixa de coordenadas (pré-filtro do Haversine). */
  async findInBoundingBox(box: { minLat: number; maxLat: number; minLng: number; maxLng: number }, take = 500, viewerId?: string) {
    return await this.prisma.evento.findMany({
      where: {
        status: 'ativo',
        data_fim: { gte: new Date() },
        latitude: { gte: box.minLat, lte: box.maxLat },
        longitude: { gte: box.minLng, lte: box.maxLng },
      },
      take,
      orderBy: { data_inicio: 'asc' },
      include: eventoInclude(viewerId)
    });
  }

  async update(id: string, data: UpdateEventoData) {
    return await this.prisma.evento.update({
      where: { id_evento: id },
      data: {
        titulo: data.titulo,
        descricao: data.descricao,
        local: data.local,
        latitude: data.latitude,
        longitude: data.longitude,
        data_inicio: data.data_inicio,
        data_fim: data.data_fim,
        tipo_evento: data.tipo_evento as any,
        imagem_url: data.imagem_url,
        status: data.status as any,
        valor_ingresso: data.valor_ingresso
      },
      include: eventoInclude()
    });
  }

  async delete(id: string): Promise<Evento> {
    return await this.prisma.evento.delete({
      where: { id_evento: id }
    });
  }

  async cancelEvent(id: string): Promise<Evento> {
    return await this.prisma.evento.update({
      where: { id_evento: id },
      data: { status: 'cancelado' }
    });
  }

  async addParticipante(id_evento: string, id_usuario: string, papel?: string): Promise<void> {
    await this.prisma.eventoParticipante.create({
      data: {
        id_evento,
        id_usuario,
        papel: papel || 'participante'
      }
    });
  }

  async removeParticipante(id_evento: string, id_usuario: string): Promise<void> {
    await this.prisma.eventoParticipante.delete({
      where: {
        id_evento_id_usuario: {
          id_evento,
          id_usuario
        }
      }
    });
  }

  /** Participantes paginados. `incluirContactos` só para o organizador. */
  async getParticipantesPaginados(id_evento: string, skip: number, take: number, incluirContactos: boolean) {
    const [rows, total] = await Promise.all([
      this.prisma.eventoParticipante.findMany({
        where: { id_evento },
        orderBy: { data_confirmacao: 'asc' },
        skip,
        take,
        select: {
          id_evento_participante: true,
          id_usuario: true,
          papel: true,
          data_confirmacao: true,
          presente: true,
          usuario: {
            select: {
              ...usuarioPublicoSelect,
              ...(incluirContactos && { email: true, telefone: true })
            }
          }
        }
      }),
      this.prisma.eventoParticipante.count({ where: { id_evento } })
    ]);
    return { rows, total };
  }

  async getParticipanteIds(id_evento: string): Promise<string[]> {
    const rows = await this.prisma.eventoParticipante.findMany({
      where: { id_evento },
      select: { id_usuario: true }
    });
    return rows.map(r => r.id_usuario);
  }

  async isParticipante(id_evento: string, id_usuario: string): Promise<boolean> {
    const participante = await this.prisma.eventoParticipante.findUnique({
      where: {
        id_evento_id_usuario: {
          id_evento,
          id_usuario
        }
      }
    });
    return !!participante;
  }

  async getEventosByOrganizador(id_organizador: string, viewerId?: string) {
    return await this.prisma.evento.findMany({
      where: { id_organizador },
      orderBy: { data_inicio: 'desc' },
      include: eventoInclude(viewerId)
    });
  }

  async getEventosByParticipante(id_usuario: string) {
    const participacoes = await this.prisma.eventoParticipante.findMany({
      where: { id_usuario },
      include: {
        evento: {
          include: eventoInclude(id_usuario)
        }
      },
      orderBy: {
        evento: {
          data_inicio: 'asc'
        }
      }
    });
    return participacoes.map(p => p.evento);
  }

  async getEstatisticas(id_organizador: string): Promise<any> {
    const [grupos, totalParticipantes, proximos] = await Promise.all([
      this.prisma.evento.groupBy({
        by: ['status'],
        where: { id_organizador },
        _count: { _all: true }
      }),
      this.prisma.eventoParticipante.count({ where: { evento: { id_organizador } } }),
      this.prisma.evento.count({ where: { id_organizador, status: 'ativo', data_inicio: { gte: new Date() } } })
    ]);

    const porStatus = (s: string) => grupos.find(g => g.status === s)?._count._all ?? 0;
    const totalEventos = grupos.reduce((sum, g) => sum + g._count._all, 0);

    return {
      total_eventos: totalEventos,
      eventos_ativos: porStatus('ativo'),
      eventos_concluidos: porStatus('concluido'),
      eventos_cancelados: porStatus('cancelado'),
      eventos_proximos: proximos,
      total_participantes: totalParticipantes,
      media_participantes_por_evento: totalEventos > 0 ? totalParticipantes / totalEventos : 0
    };
  }
}
