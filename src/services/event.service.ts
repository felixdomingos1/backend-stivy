import { CreateEventoDto, UpdateEventoDto } from '../dtos/event.dto';
import { EventoRepository, EventoFilters } from '../repositories/evento.repository';
import { FazedorRepository } from '../repositories/fazedor.repository';
import { NotificacaoRepository } from '../repositories/notificacao.repository';
import { ValidationError, NotFoundError } from '../utils/errors';
import {
  ForbiddenError,
  getFazedorIdByUsuario,
  toNumber,
  haversineKm,
  boundingBox
} from './authorization.service';
import logger from '../utils/logger';

/**
 * Formata um evento para o contrato: decimais -> number, organizador público,
 * total_participantes, eu_participo e sou_organizador.
 */
export const formatEvento = (evento: any, viewerId?: string, extra: Record<string, any> = {}) => {
  if (!evento) return evento;
  const { _count, participantes, ...rest } = evento;
  return {
    ...rest,
    latitude: toNumber(evento.latitude),
    longitude: toNumber(evento.longitude),
    valor_ingresso: toNumber(evento.valor_ingresso) ?? 0,
    total_participantes: _count?.participantes ?? 0,
    eu_participo: !!viewerId && Array.isArray(participantes) && participantes.some((p: any) => p.id_usuario === viewerId),
    sou_organizador: !!viewerId && evento.organizador?.id_usuario === viewerId,
    ...extra
  };
};

export class EventService {
  constructor(
    private eventoRepository: EventoRepository,
    private fazedorRepository: FazedorRepository,
    private notificacaoRepository: NotificacaoRepository
  ) { }

  /** Carrega o evento e garante que o utilizador é o organizador (id_organizador = id_fazedor). */
  private async getEventoComoOrganizador(id: string, usuarioId: string, acao: string) {
    const evento = await this.eventoRepository.findById(id);
    if (!evento) {
      throw new NotFoundError('Evento não encontrado');
    }
    const fazedorId = await getFazedorIdByUsuario(usuarioId);
    if (!fazedorId || evento.id_organizador !== fazedorId) {
      throw new ForbiddenError(`Você não tem permissão para ${acao} este evento`);
    }
    return evento;
  }

  private validarCoordenadas(lat?: number | null, lng?: number | null) {
    const temLat = lat !== undefined && lat !== null;
    const temLng = lng !== undefined && lng !== null;
    if (temLat !== temLng) {
      throw new ValidationError('Latitude e longitude devem ser enviadas juntas');
    }
  }

  async createEvento(organizadorId: string, dto: CreateEventoDto): Promise<any> {
    const fazedor = await this.fazedorRepository.findFazedorByUserId(organizadorId);

    if (!fazedor) {
      throw new ForbiddenError('Você precisa ser um fazedor para criar eventos.');
    }

    const dataInicio = new Date(dto.data_inicio);
    const dataFim = new Date(dto.data_fim);

    if (dataInicio >= dataFim) {
      throw new ValidationError('Data de início deve ser menor que data de fim');
    }

    if (dataInicio < new Date()) {
      throw new ValidationError('Data do evento não pode ser no passado');
    }

    const latitude = toNumber(dto.latitude) ?? undefined;
    const longitude = toNumber(dto.longitude) ?? undefined;
    this.validarCoordenadas(latitude, longitude);

    const imagens = dto.imagens || [];

    const evento = await this.eventoRepository.create({
      id_organizador: fazedor.id_fazedor,
      titulo: dto.titulo,
      descricao: dto.descricao,
      local: dto.local,
      latitude,
      longitude,
      data_inicio: dataInicio,
      data_fim: dataFim,
      tipo_evento: dto.tipo_evento,
      imagem_url: imagens.length > 0 ? imagens[0].imagem_url : undefined,
      imagem_public_id: imagens.length > 0 ? imagens[0].imagem_public_id : undefined,
      banner_url: dto.banner_url,
      banner_public_id: dto.banner_public_id,
      imagens: imagens,
      valor_ingresso: toNumber(dto.valor_ingresso) ?? undefined
    });

    logger.info(`[EVENT_SERVICE] Evento criado: ${evento.titulo} - Organizador: ${fazedor.id_fazedor}`);
    return formatEvento(evento, organizadorId);
  }

  async getEventoById(id: string, viewerId?: string): Promise<any> {
    const evento = await this.eventoRepository.findById(id, viewerId);
    if (!evento) {
      throw new NotFoundError('Evento não encontrado');
    }
    return formatEvento(evento, viewerId);
  }

  async listEventos(filters: EventoFilters, page: number = 1, limit: number = 20, viewerId?: string): Promise<any> {
    const skip = (page - 1) * limit;
    const [eventos, total] = await Promise.all([
      this.eventoRepository.findAll(filters, skip, limit, viewerId),
      this.eventoRepository.count(filters)
    ]);

    return {
      data: eventos.map(e => formatEvento(e, viewerId)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Eventos activos e não terminados. Com lat/lng: filtra por raio (Haversine com pré-filtro
   * por caixa de coordenadas), ordena por distância e inclui `distancia_km`.
   */
  async listEventosProximos(
    params: { lat: number | null; lng: number | null; raio: number; limit: number },
    viewerId?: string
  ): Promise<any[]> {
    const limit = Math.min(Math.max(params.limit || 50, 1), 200);

    if (params.lat === null || params.lng === null) {
      const eventos = await this.eventoRepository.findAll({ proximos: true }, 0, limit, viewerId);
      return eventos.map(e => formatEvento(e, viewerId));
    }

    const { lat, lng, raio } = params;
    const candidatos = await this.eventoRepository.findInBoundingBox(boundingBox(lat, lng, raio), 1000, viewerId);

    return candidatos
      .map(e => {
        const eLat = toNumber(e.latitude)!;
        const eLng = toNumber(e.longitude)!;
        const distancia = haversineKm(lat, lng, eLat, eLng);
        return { e, distancia };
      })
      .filter(({ distancia }) => distancia <= raio)
      .sort((a, b) => a.distancia - b.distancia)
      .slice(0, limit)
      .map(({ e, distancia }) => formatEvento(e, viewerId, { distancia_km: Math.round(distancia * 100) / 100 }));
  }

  async updateEvento(id: string, usuarioId: string, dto: UpdateEventoDto): Promise<any> {
    const evento = await this.getEventoComoOrganizador(id, usuarioId, 'editar');

    if (evento.status === 'cancelado') {
      throw new ValidationError('Eventos cancelados não podem ser editados');
    }

    if (evento.status === 'concluido') {
      throw new ValidationError('Eventos concluídos não podem ser editados');
    }

    const dataInicio = dto.data_inicio ? new Date(dto.data_inicio) : evento.data_inicio;
    const dataFim = dto.data_fim ? new Date(dto.data_fim) : evento.data_fim;
    if (dataInicio >= dataFim) {
      throw new ValidationError('Data de início deve ser menor que data de fim');
    }

    const latitude = dto.latitude === undefined ? undefined : toNumber(dto.latitude);
    const longitude = dto.longitude === undefined ? undefined : toNumber(dto.longitude);
    if (latitude !== undefined || longitude !== undefined) {
      this.validarCoordenadas(latitude ?? null, longitude ?? null);
    }

    // Allowlist explícita (status 'cancelado' só via DELETE)
    if (dto.status === 'cancelado') {
      throw new ValidationError('Use DELETE /events/:id para cancelar o evento');
    }

    const updated = await this.eventoRepository.update(id, {
      titulo: dto.titulo,
      descricao: dto.descricao,
      local: dto.local,
      latitude,
      longitude,
      data_inicio: dto.data_inicio ? dataInicio : undefined,
      data_fim: dto.data_fim ? dataFim : undefined,
      tipo_evento: dto.tipo_evento,
      status: dto.status,
      valor_ingresso: dto.valor_ingresso === undefined ? undefined : (toNumber(dto.valor_ingresso) ?? 0)
    });
    logger.info(`Evento atualizado: ${id}`);

    const mudouData = dto.data_inicio || dto.data_fim || dto.local !== undefined;
    if (mudouData) {
      const ids = await this.eventoRepository.getParticipanteIds(id);
      if (ids.length > 0) {
        await this.notificacaoRepository.enviarNotificacaoEvento(
          id,
          ids,
          'Evento atualizado',
          `O evento "${updated.titulo}" foi atualizado. Confira a data e o local.`
        ).catch(err => logger.error('Erro ao notificar participantes:', err));
      }
    }

    return formatEvento(updated, usuarioId);
  }

  async cancelEvento(id: string, usuarioId: string): Promise<void> {
    const evento = await this.getEventoComoOrganizador(id, usuarioId, 'cancelar');

    if (evento.status === 'cancelado') {
      throw new ValidationError('Evento já está cancelado');
    }

    if (evento.status === 'concluido') {
      throw new ValidationError('Eventos concluídos não podem ser cancelados');
    }

    await this.eventoRepository.cancelEvent(id);

    const ids = await this.eventoRepository.getParticipanteIds(id);
    if (ids.length > 0) {
      await this.notificacaoRepository.enviarNotificacaoEvento(
        id,
        ids,
        'Evento Cancelado',
        `O evento "${evento.titulo}" foi cancelado.`
      ).catch(err => logger.error('Erro ao notificar participantes:', err));
    }

    logger.info(`Evento cancelado: ${id}`);
  }

  async participarEvento(eventoId: string, usuarioId: string): Promise<void> {
    const evento = await this.eventoRepository.findById(eventoId);
    if (!evento) {
      throw new NotFoundError('Evento não encontrado');
    }

    if (evento.status !== 'ativo') {
      throw new ValidationError('Este evento não está mais ativo');
    }

    if (evento.data_fim < new Date()) {
      throw new ValidationError('Este evento já terminou');
    }

    const isParticipante = await this.eventoRepository.isParticipante(eventoId, usuarioId);
    if (isParticipante) {
      throw new ValidationError('Você já está participando deste evento');
    }

    await this.eventoRepository.addParticipante(eventoId, usuarioId);

    if (evento.organizador.id_usuario !== usuarioId) {
      await this.notificacaoRepository.createSafe({
        id_usuario: evento.organizador.id_usuario,
        titulo: 'Nova participação no evento',
        mensagem: `Alguém confirmou presença em "${evento.titulo}".`,
        tipo: 'evento',
        link: `/evento/${eventoId}`,
        id_ator: usuarioId
      });
    }

    logger.info(`Usuário ${usuarioId} participará do evento ${eventoId}`);
  }

  async cancelarParticipacao(eventoId: string, usuarioId: string): Promise<void> {
    const evento = await this.eventoRepository.findById(eventoId);
    if (!evento) {
      throw new NotFoundError('Evento não encontrado');
    }

    const isParticipante = await this.eventoRepository.isParticipante(eventoId, usuarioId);
    if (!isParticipante) {
      throw new ValidationError('Você não está participando deste evento');
    }

    await this.eventoRepository.removeParticipante(eventoId, usuarioId);

    logger.info(`Usuário ${usuarioId} cancelou participação no evento ${eventoId}`);
  }

  /** Público vê nome+foto; o organizador vê também email/telefone. */
  async listParticipantes(eventoId: string, page: number = 1, limit: number = 20, viewerId?: string): Promise<any> {
    const evento = await this.eventoRepository.findById(eventoId);
    if (!evento) {
      throw new NotFoundError('Evento não encontrado');
    }

    const souOrganizador = !!viewerId && evento.organizador.id_usuario === viewerId;
    const skip = (page - 1) * limit;
    const { rows, total } = await this.eventoRepository.getParticipantesPaginados(eventoId, skip, limit, souOrganizador);

    return {
      data: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      sou_organizador: souOrganizador
    };
  }

  async getMeusEventos(usuarioId: string): Promise<any> {
    const fazedorId = await getFazedorIdByUsuario(usuarioId);
    if (!fazedorId) return [];
    const eventos = await this.eventoRepository.getEventosByOrganizador(fazedorId, usuarioId);
    return eventos.map(e => formatEvento(e, usuarioId));
  }

  async getEventosParticipando(usuarioId: string): Promise<any> {
    const eventos = await this.eventoRepository.getEventosByParticipante(usuarioId);
    return eventos.map(e => formatEvento(e, usuarioId));
  }

  async getEstatisticas(usuarioId: string): Promise<any> {
    const fazedorId = await getFazedorIdByUsuario(usuarioId);
    if (!fazedorId) {
      throw new ForbiddenError('Apenas fazedores têm estatísticas de eventos');
    }

    return await this.eventoRepository.getEstatisticas(fazedorId);
  }
}
