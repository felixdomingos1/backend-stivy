import { PrismaClient, Evento } from '@prisma/client';
import prisma from '../config/database';

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
  vagas_disponiveis?: number;
  valor_ingresso?: number;
}

export interface UpdateEventoData {
  titulo?: string;
  descricao?: string;
  local?: string;
  latitude?: number;
  longitude?: number;
  data_inicio?: Date;
  data_fim?: Date;
  tipo_evento?: string;
  imagem_url?: string;
  status?: string;
  vagas_disponiveis?: number;
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

export class EventoRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
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
        vagas_disponiveis: data.vagas_disponiveis || 0,
        valor_ingresso: data.valor_ingresso || 0,
        status: 'ativo'
      }
    });
  }

  async findById(id: string): Promise<Evento | null> {
    return await this.prisma.evento.findUnique({
      where: { id_evento: id },
      include: {
        organizador: {
          include: {
            usuario: {
              select: {
                nome: true,
                email: true,
                foto_perfil: true
              }
            }
          }
        },
        participantes: {
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
        }
      }
    });
  }

  async findAll(filters?: EventoFilters, skip?: number, take?: number): Promise<Evento[]> {
    const where: any = {};

    if (filters?.tipo) {
      where.tipo_evento = filters.tipo;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.id_organizador) {
      where.id_organizador = filters.id_organizador;
    }

    if (filters?.proximos) {
      where.data_inicio = { gte: new Date() };
      where.status = 'ativo';
    }

    if (filters?.data_inicio || filters?.data_fim) {
      where.data_inicio = {};
      if (filters.data_inicio) {
        where.data_inicio.gte = filters.data_inicio;
      }
      if (filters.data_fim) {
        where.data_inicio.lte = filters.data_fim;
      }
    }

    if (filters?.search) {
      where.OR = [
        { titulo: { contains: filters.search } },
        { descricao: { contains: filters.search } },
        { local: { contains: filters.search } }
      ];
    }

    return await this.prisma.evento.findMany({
      where,
      skip: skip || 0,
      take: take || 50,
      orderBy: { data_inicio: 'asc' },
      include: {
        organizador: {
          include: {
            usuario: {
              select: {
                nome: true,
                email: true,
                foto_perfil: true
              }
            }
          }
        },
        participantes: {
          take: 5,
          include: {
            usuario: {
              select: {
                nome: true,
                foto_perfil: true
              }
            }
          }
        }
      }
    });
  }

  async count(filters?: EventoFilters): Promise<number> {
    const where: any = {};

    if (filters?.tipo) {
      where.tipo_evento = filters.tipo;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.id_organizador) {
      where.id_organizador = filters.id_organizador;
    }

    if (filters?.proximos) {
      where.data_inicio = { gte: new Date() };
      where.status = 'ativo';
    }

    if (filters?.search) {
      where.OR = [
        { titulo: { contains: filters.search } },
        { descricao: { contains: filters.search } }
      ];
    }

    return await this.prisma.evento.count({ where });
  }

  async update(id: string, data: UpdateEventoData): Promise<Evento> {
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
        vagas_disponiveis: data.vagas_disponiveis,
        valor_ingresso: data.valor_ingresso
      }
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

    // Atualizar vagas disponíveis
    await this.prisma.evento.update({
      where: { id_evento },
      data: {
        vagas_disponiveis: {
          decrement: 1
        }
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

    // Atualizar vagas disponíveis
    await this.prisma.evento.update({
      where: { id_evento },
      data: {
        vagas_disponiveis: {
          increment: 1
        }
      }
    });
  }

  async getParticipantes(id_evento: string): Promise<any[]> {
    return await this.prisma.eventoParticipante.findMany({
      where: { id_evento },
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

  async getEventosByOrganizador(id_organizador: string): Promise<Evento[]> {
    return await this.prisma.evento.findMany({
      where: { id_organizador },
      orderBy: { data_inicio: 'desc' },
      include: {
        participantes: true
      }
    });
  }

  async getEventosByParticipante(id_usuario: string): Promise<any[]> {
    const participacoes = await this.prisma.eventoParticipante.findMany({
      where: { id_usuario },
      include: {
        evento: {
          include: {
            organizador: {
              include: {
                usuario: {
                  select: {
                    nome: true,
                    foto_perfil: true
                  }
                }
              }
            }
          }
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
    const eventos = await this.prisma.evento.findMany({
      where: { id_organizador },
      include: {
        participantes: true
      }
    });

    const totalEventos = eventos.length;
    const eventosAtivos = eventos.filter(e => e.status === 'ativo').length;
    const eventosConcluidos = eventos.filter(e => e.status === 'concluido').length;
    const eventosCancelados = eventos.filter(e => e.status === 'cancelado').length;
    const totalParticipantes = eventos.reduce((sum, e) => sum + e.participantes.length, 0);

    return {
      total_eventos: totalEventos,
      eventos_ativos: eventosAtivos,
      eventos_concluidos: eventosConcluidos,
      eventos_cancelados: eventosCancelados,
      total_participantes: totalParticipantes,
      media_participantes_por_evento: totalEventos > 0 ? totalParticipantes / totalEventos : 0
    };
  }
}
