import { CreateEventoDto, UpdateEventoDto } from '../dtos/event.dto';
import { EventoRepository, EventoFilters } from '../repositories/evento.repository';
import { FazedorRepository } from '../repositories/fazedor.repository';
import { NotificacaoRepository } from '../repositories/notificacao.repository';
import { ValidationError, NotFoundError } from '../utils/errors';
import logger from '../utils/logger';

export class EventService {
  constructor(
    private eventoRepository: EventoRepository,
    private fazedorRepository: FazedorRepository,
    private notificacaoRepository: NotificacaoRepository
  ) { }

  async createEvento(organizadorId: string, dto: CreateEventoDto): Promise<any> {
    const fazedor = await this.fazedorRepository.findFazedorByUserId(organizadorId);
    if (!fazedor) {
      throw new NotFoundError('Organizador não encontrado');
    }

    if (fazedor.status_aprovacao !== 'aprovado') {
      throw new ValidationError('Seu perfil precisa ser aprovado para criar eventos');
    }

    if (dto.data_inicio >= dto.data_fim) {
      throw new ValidationError('Data de início deve ser menor que data de fim');
    }

    if (dto.data_inicio < new Date()) {
      throw new ValidationError('Data do evento não pode ser no passado');
    }

    const evento = await this.eventoRepository.create({
      id_organizador: organizadorId,
      titulo: dto.titulo,
      descricao: dto.descricao,
      local: dto.local,
      latitude: dto.latitude,
      longitude: dto.longitude,
      data_inicio: dto.data_inicio,
      data_fim: dto.data_fim,
      tipo_evento: dto.tipo_evento,
      vagas_disponiveis: dto.vagas_disponiveis,
      valor_ingresso: dto.valor_ingresso
    });

    logger.info(`Evento criado: ${evento.titulo} - Organizador: ${organizadorId}`);
    return evento;
  }

  async getEventoById(id: string): Promise<any> {
    const evento = await this.eventoRepository.findById(id);
    if (!evento) {
      throw new NotFoundError('Evento não encontrado');
    }
    return evento;
  }

  async listEventos(filters: EventoFilters, page: number = 1, limit: number = 20): Promise<any> {
    const skip = (page - 1) * limit;
    const [eventos, total] = await Promise.all([
      this.eventoRepository.findAll(filters, skip, limit),
      this.eventoRepository.count(filters)
    ]);

    return {
      data: eventos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async listEventosProximos(limit: number = 10): Promise<any> {
    return await this.eventoRepository.findAll({ proximos: true }, 0, limit);
  }

  async updateEvento(id: string, organizadorId: string, dto: UpdateEventoDto): Promise<any> {
    const evento = await this.eventoRepository.findById(id);
    if (!evento) {
      throw new NotFoundError('Evento não encontrado');
    }

    if (evento.id_organizador !== organizadorId) {
      throw new ValidationError('Você não tem permissão para editar este evento');
    }

    if (evento.status === 'cancelado') {
      throw new ValidationError('Eventos cancelados não podem ser editados');
    }

    if (evento.status === 'concluido') {
      throw new ValidationError('Eventos concluídos não podem ser editados');
    }

    const updated = await this.eventoRepository.update(id, dto);
    logger.info(`Evento atualizado: ${id}`);
    return updated;
  }

  async cancelEvento(id: string, organizadorId: string): Promise<void> {
    const evento = await this.eventoRepository.findById(id);
    if (!evento) {
      throw new NotFoundError('Evento não encontrado');
    }

    if (evento.id_organizador !== organizadorId) {
      throw new ValidationError('Você não tem permissão para cancelar este evento');
    }

    if (evento.status === 'cancelado') {
      throw new ValidationError('Evento já está cancelado');
    }

    if (evento.status === 'concluido') {
      throw new ValidationError('Eventos concluídos não podem ser cancelados');
    }

    await this.eventoRepository.cancelEvent(id);

    // Notificar participantes
    const participantes = await this.eventoRepository.getParticipantes(id);
    if (participantes.length > 0) {
      await this.notificacaoRepository.enviarNotificacaoEvento(
        id,
        participantes.map(p => p.id_usuario),
        'Evento Cancelado',
        `O evento "${evento.titulo}" foi cancelado.`
      );
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

    if (evento.data_inicio < new Date()) {
      throw new ValidationError('Este evento já começou');
    }

    if (evento.vagas_disponiveis <= 0) {
      throw new ValidationError('Não há vagas disponíveis para este evento');
    }

    const isParticipante = await this.eventoRepository.isParticipante(eventoId, usuarioId);
    if (isParticipante) {
      throw new ValidationError('Você já está participando deste evento');
    }

    await this.eventoRepository.addParticipante(eventoId, usuarioId);

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

  async listParticipantes(eventoId: string, page: number = 1, limit: number = 20): Promise<any> {
    const evento = await this.eventoRepository.findById(eventoId);
    if (!evento) {
      throw new NotFoundError('Evento não encontrado');
    }

    const participantes = await this.eventoRepository.getParticipantes(eventoId);
    const total = participantes.length;
    const start = (page - 1) * limit;
    const paginated = participantes.slice(start, start + limit);

    return {
      data: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getMeusEventos(organizadorId: string): Promise<any> {
    return await this.eventoRepository.getEventosByOrganizador(organizadorId);
  }

  async getEventosParticipando(usuarioId: string): Promise<any> {
    return await this.eventoRepository.getEventosByParticipante(usuarioId);
  }

  async getEstatisticas(organizadorId: string): Promise<any> {
    const fazedor = await this.fazedorRepository.findFazedorByUserId(organizadorId);
    if (!fazedor) {
      throw new NotFoundError('Organizador não encontrado');
    }

    return await this.eventoRepository.getEstatisticas(organizadorId);
  }
}
