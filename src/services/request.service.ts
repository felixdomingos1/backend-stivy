import { RequisicaoRepository, RequisicaoFilters, RequisicaoWithRelations, formatRequisicao } from '../repositories/requisicao.repository';
import { ServicoRepository } from '../repositories/servico.repository';
import { NotificacaoRepository } from '../repositories/notificacao.repository';
import { ChatRepository } from '../repositories/chat.repository';
import { ValidationError, NotFoundError } from '../utils/errors';
import logger from '../utils/logger';
import { CreateRequisicaoDto } from '../dtos/request.dto';
import { ModeloRepository } from '../repositories/modelo.repository';
import { ChatService } from './chat.service';
import { ForbiddenError, getFazedorIdByUsuario } from './authorization.service';
import prisma from '../config/database';

/** id_usuario do profissional dono da requisição (fazedor do serviço ou agência do modelo). */
const getIdUsuarioDono = (r: RequisicaoWithRelations): string | undefined =>
  r.servico?.fazedor?.id_usuario ?? r.modelo?.agencia?.fazedor?.id_usuario;

export class RequestService {
  private chatService: ChatService;

  constructor(
    private requisicaoRepository: RequisicaoRepository,
    _servicoRepository: ServicoRepository,
    _modeloRepository: ModeloRepository,
    private notificacaoRepository: NotificacaoRepository,
    chatService?: ChatService
  ) {
    this.chatService = chatService ?? new ChatService(new ChatRepository(), notificacaoRepository);
  }

  async requisitarServico(solicitanteId: string, servicoId: string, dto: CreateRequisicaoDto): Promise<any> {
    const servico = await prisma.servico.findUnique({
      where: { id_servico: servicoId },
      select: { id_servico: true, titulo: true, status: true, fazedor: { select: { id_usuario: true } } }
    });
    if (!servico) {
      throw new NotFoundError('Serviço não encontrado');
    }

    if (servico.status !== 'ativo') {
      throw new ValidationError('Este serviço não está mais disponível');
    }

    if (servico.fazedor.id_usuario === solicitanteId) {
      throw new ValidationError('Você não pode requisitar seu próprio serviço');
    }

    const requisicao = await this.requisicaoRepository.create({
      id_solicitante: solicitanteId,
      id_servico: servicoId,
      mensagem: dto.mensagem,
      contato_retorno: dto.contato_retorno
    });

    // Falha na notificação nunca falha o pedido
    await this.notificacaoRepository.createSafe({
      id_usuario: servico.fazedor.id_usuario,
      titulo: 'Nova requisição',
      mensagem: `${requisicao.solicitante.nome} pediu o serviço "${servico.titulo}".`,
      tipo: 'requisicao',
      link: `/requisicao/${requisicao.id_requisicao}`,
      id_ator: solicitanteId
    });

    logger.info(`Requisição de serviço criada: ${solicitanteId} -> ${servicoId}`);
    return formatRequisicao(requisicao);
  }

  async requisitarModelo(solicitanteId: string, modeloId: string, dto: CreateRequisicaoDto): Promise<any> {
    const modelo = await prisma.modelo.findUnique({
      where: { id_modelo: modeloId },
      select: {
        id_modelo: true,
        status: true,
        nome_artistico: true,
        nome_completo: true,
        agencia: { select: { fazedor: { select: { id_usuario: true } } } }
      }
    });
    if (!modelo) {
      throw new NotFoundError('Modelo não encontrado');
    }

    if (modelo.status !== 'ativo') {
      throw new ValidationError('Este modelo não está mais disponível');
    }

    const idUsuarioAgencia = modelo.agencia.fazedor.id_usuario;
    if (idUsuarioAgencia === solicitanteId) {
      throw new ValidationError('Você não pode requisitar um modelo da sua própria agência');
    }

    const requisicao = await this.requisicaoRepository.create({
      id_solicitante: solicitanteId,
      id_modelo: modeloId,
      mensagem: dto.mensagem,
      contato_retorno: dto.contato_retorno
    });

    await this.notificacaoRepository.createSafe({
      id_usuario: idUsuarioAgencia,
      titulo: 'Nova requisição de modelo',
      mensagem: `${requisicao.solicitante.nome} pediu o(a) modelo ${modelo.nome_artistico || modelo.nome_completo}.`,
      tipo: 'requisicao',
      link: `/requisicao/${requisicao.id_requisicao}`,
      id_ator: solicitanteId
    });

    logger.info(`Requisição de modelo criada: ${solicitanteId} -> ${modeloId}`);
    return formatRequisicao(requisicao);
  }

  async getRequisicaoById(id: string, usuarioId: string): Promise<any> {
    const requisicao = await this.requisicaoRepository.findById(id);
    if (!requisicao) {
      throw new NotFoundError('Requisição não encontrada');
    }

    const isSolicitante = requisicao.id_solicitante === usuarioId;
    const isDono = getIdUsuarioDono(requisicao) === usuarioId;

    if (!isSolicitante && !isDono) {
      throw new ForbiddenError('Você não tem permissão para ver esta requisição');
    }

    return formatRequisicao(requisicao);
  }

  async listMinhasRequisicoes(usuarioId: string, filters: RequisicaoFilters, page: number = 1, limit: number = 20): Promise<any> {
    const skip = (page - 1) * limit;
    const [requisicoes, total] = await Promise.all([
      this.requisicaoRepository.findAll({ ...filters, id_solicitante: usuarioId }, skip, limit),
      this.requisicaoRepository.count({ ...filters, id_solicitante: usuarioId })
    ]);

    return {
      data: requisicoes.map(formatRequisicao),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /** `usuarioId` = utilizador autenticado; o fazedor é resolvido aqui. */
  async listRequisicoesRecebidas(usuarioId: string, filters: RequisicaoFilters, page: number = 1, limit: number = 20): Promise<any> {
    const fazedorId = await getFazedorIdByUsuario(usuarioId);
    if (!fazedorId) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const skip = (page - 1) * limit;
    const [requisicoes, total] = await Promise.all([
      this.requisicaoRepository.findByFazedor(fazedorId, filters, skip, limit),
      this.requisicaoRepository.countByFazedor(fazedorId, filters)
    ]);

    return {
      data: requisicoes.map(formatRequisicao),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  private async getComoDono(id: string, usuarioId: string, acao: string): Promise<RequisicaoWithRelations> {
    const requisicao = await this.requisicaoRepository.findById(id);
    if (!requisicao) {
      throw new NotFoundError('Requisição não encontrada');
    }
    if (getIdUsuarioDono(requisicao) !== usuarioId) {
      throw new ForbiddenError(`Você não tem permissão para ${acao} esta requisição`);
    }
    return requisicao;
  }

  async aceitarRequisicao(id: string, usuarioId: string): Promise<any> {
    const requisicao = await this.getComoDono(id, usuarioId, 'aceitar');

    if (requisicao.status !== 'pendente') {
      throw new ValidationError(`Requisição já está ${requisicao.status}`);
    }

    const updated = await this.requisicaoRepository.updateStatus(id, 'aceita');

    await this.notificacaoRepository.createSafe({
      id_usuario: requisicao.id_solicitante,
      titulo: 'Requisição Aceita!',
      mensagem: 'A sua requisição foi aceite. Já pode conversar com o profissional no chat.',
      tipo: 'requisicao',
      link: `/requisicao/${id}`,
      id_ator: usuarioId
    });

    // Conversa direct entre profissional e solicitante (criada ou reutilizada)
    let id_conversa: string | null = null;
    try {
      const assunto = requisicao.servico?.titulo
        ?? requisicao.modelo?.nome_artistico
        ?? requisicao.modelo?.nome_completo
        ?? 'o seu pedido';
      id_conversa = await this.chatService.obterOuCriarConversaDirect(
        usuarioId,
        requisicao.id_solicitante,
        `Requisição aceite: ${assunto}. Podem combinar os detalhes por aqui.`
      );
    } catch (error) {
      logger.error(`Falha ao criar conversa para requisição ${id}:`, error);
    }

    logger.info(`Requisição aceita: ${id} por utilizador ${usuarioId}`);
    return { ...formatRequisicao(updated), id_conversa };
  }

  async recusarRequisicao(id: string, usuarioId: string, motivo?: string): Promise<any> {
    const requisicao = await this.getComoDono(id, usuarioId, 'recusar');

    if (requisicao.status !== 'pendente') {
      throw new ValidationError(`Requisição já está ${requisicao.status}`);
    }

    const updated = await this.requisicaoRepository.update(id, {
      status: 'recusada',
      observacoes: motivo
    });

    await this.notificacaoRepository.createSafe({
      id_usuario: requisicao.id_solicitante,
      titulo: 'Requisição Recusada',
      mensagem: motivo ? `A sua requisição foi recusada: ${motivo}` : 'Infelizmente a sua requisição foi recusada.',
      tipo: 'requisicao',
      link: `/requisicao/${id}`,
      id_ator: usuarioId
    });

    logger.info(`Requisição recusada: ${id} por utilizador ${usuarioId}`);
    return formatRequisicao(updated);
  }

  async cancelarRequisicao(id: string, solicitanteId: string): Promise<any> {
    const requisicao = await this.requisicaoRepository.findById(id);
    if (!requisicao) {
      throw new NotFoundError('Requisição não encontrada');
    }

    if (requisicao.id_solicitante !== solicitanteId) {
      throw new ForbiddenError('Você só pode cancelar suas próprias requisições');
    }

    if (requisicao.status !== 'pendente' && requisicao.status !== 'aceita') {
      throw new ValidationError(`Requisições ${requisicao.status} não podem ser canceladas`);
    }

    const updated = await this.requisicaoRepository.updateStatus(id, 'cancelada');

    const idUsuarioDono = getIdUsuarioDono(requisicao);
    if (idUsuarioDono) {
      await this.notificacaoRepository.createSafe({
        id_usuario: idUsuarioDono,
        titulo: 'Requisição cancelada',
        mensagem: `${requisicao.solicitante.nome} cancelou um pedido de contratação.`,
        tipo: 'requisicao',
        link: `/requisicao/${id}`,
        id_ator: solicitanteId
      });
    }

    logger.info(`Requisição cancelada: ${id} por solicitante ${solicitanteId}`);
    return formatRequisicao(updated);
  }

  async concluirRequisicao(id: string, usuarioId: string): Promise<any> {
    const requisicao = await this.getComoDono(id, usuarioId, 'concluir');

    if (requisicao.status !== 'aceita') {
      throw new ValidationError('Apenas requisições aceitas podem ser concluídas');
    }

    const updated = await this.requisicaoRepository.updateStatus(id, 'concluida');

    await this.notificacaoRepository.createSafe({
      id_usuario: requisicao.id_solicitante,
      titulo: 'Requisição Concluída',
      mensagem: 'A sua requisição foi concluída. Que tal deixar uma avaliação?',
      tipo: 'requisicao',
      link: `/requisicao/${id}`,
      id_ator: usuarioId
    });

    logger.info(`Requisição concluída: ${id} por utilizador ${usuarioId}`);
    return formatRequisicao(updated);
  }

  /** Estatísticas: como fazedor (recebidas) e como solicitante (enviadas). */
  async getEstatisticas(usuarioId: string): Promise<any> {
    const fazedorId = await getFazedorIdByUsuario(usuarioId);
    const [recebidas, enviadas] = await Promise.all([
      fazedorId ? this.requisicaoRepository.getEstatisticas(fazedorId) : Promise.resolve(null),
      this.requisicaoRepository.getEstatisticas(undefined, usuarioId)
    ]);
    return { ...(recebidas ?? enviadas), recebidas, enviadas };
  }
}
