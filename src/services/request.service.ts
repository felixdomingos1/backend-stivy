import { RequisicaoRepository, RequisicaoFilters } from '../repositories/requisicao.repository';
import { ServicoRepository } from '../repositories/servico.repository';
import { NotificacaoRepository } from '../repositories/notificacao.repository';
import { ValidationError, NotFoundError } from '../utils/errors';
import logger from '../utils/logger';
import { CreateRequisicaoDto } from '../dtos/request.dto';
import { ModeloRepository } from '../repositories/modelo.repository';

export class RequestService {
  constructor(
    private requisicaoRepository: RequisicaoRepository,
    private servicoRepository: ServicoRepository,
    private modeloRepository: ModeloRepository,
    private notificacaoRepository: NotificacaoRepository
  ) { }

  async requisitarServico(solicitanteId: string, servicoId: string, dto: CreateRequisicaoDto): Promise<any> {
    const servico = await this.servicoRepository.findById(servicoId);
    if (!servico) {
      throw new NotFoundError('Serviço não encontrado');
    }

    if (servico.status !== 'ativo') {
      throw new ValidationError('Este serviço não está mais disponível');
    }

    if (servico.fazedor?.usuario?.id_usuario === solicitanteId) {
      throw new ValidationError('Você não pode requisitar seu próprio serviço');
    }

    const requisicao = await this.requisicaoRepository.create({
      id_solicitante: solicitanteId,
      id_servico: servicoId,
      mensagem: dto.mensagem,
      contato_retorno: dto.contato_retorno
    });

    await this.notificacaoRepository.enviarNotificacaoRequisicao(
      requisicao.id_requisicao,
      servico.fazedor?.id_fazedor!,
      'pendente'
    );

    logger.info(`Requisição de serviço criada: ${solicitanteId} -> ${servicoId}`);
    return requisicao;
  }

  async requisitarModelo(solicitanteId: string, modeloId: string, dto: CreateRequisicaoDto): Promise<any> {
    const modelo = await this.modeloRepository.findById(modeloId);
    if (!modelo) {
      throw new NotFoundError('Modelo não encontrado');
    }

    if (modelo.status !== 'ativo') {
      throw new ValidationError('Este modelo não está mais disponível');
    }

    const requisicao = await this.requisicaoRepository.create({
      id_solicitante: solicitanteId,
      id_modelo: modeloId,
      mensagem: dto.mensagem,
      contato_retorno: dto.contato_retorno
    });

    const idFazedor = modelo.agencia?.id_fazedor;
    if (idFazedor) {
      await this.notificacaoRepository.enviarNotificacaoRequisicao(
        requisicao.id_requisicao,
        idFazedor,
        'pendente'
      );
    }

    logger.info(`Requisição de modelo criada: ${solicitanteId} -> ${modeloId}`);
    return requisicao;
  }

  async getRequisicaoById(id: string, usuarioId: string): Promise<any> {
    const requisicao = await this.requisicaoRepository.findById(id);
    if (!requisicao) {
      throw new NotFoundError('Requisição não encontrada');
    }

    const isSolicitante = requisicao.id_solicitante === usuarioId;
    const isFazedor = requisicao.servico?.fazedor?.id_usuario === usuarioId ||
      requisicao.modelo?.agencia?.fazedor?.id_usuario === usuarioId;

    if (!isSolicitante && !isFazedor) {
      throw new ValidationError('Você não tem permissão para ver esta requisição');
    }

    return requisicao;
  }

  async listMinhasRequisicoes(usuarioId: string, filters: RequisicaoFilters, page: number = 1, limit: number = 20): Promise<any> {
    const skip = (page - 1) * limit;
    const [requisicoes, total] = await Promise.all([
      this.requisicaoRepository.findAll({ ...filters, id_solicitante: usuarioId }, skip, limit),
      this.requisicaoRepository.count({ ...filters, id_solicitante: usuarioId })
    ]);

    return {
      data: requisicoes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async listRequisicoesRecebidas(fazedorId: string, filters: RequisicaoFilters, page: number = 1, limit: number = 20): Promise<any> {
    const skip = (page - 1) * limit;
    const todasRequisicoes = await this.requisicaoRepository.findByFazedor(fazedorId);

    let filtered = todasRequisicoes;
    if (filters?.status) {
      filtered = filtered.filter(r => r.status === filters.status);
    }
    if (filters?.data_inicio) {
      filtered = filtered.filter(r => r.data_requisicao >= filters.data_inicio!);
    }
    if (filters?.data_fim) {
      filtered = filtered.filter(r => r.data_requisicao <= filters.data_fim!);
    }

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limit);

    return {
      data: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async aceitarRequisicao(id: string, fazedorId: string): Promise<any> {
    const requisicao = await this.requisicaoRepository.findById(id);
    if (!requisicao) {
      throw new NotFoundError('Requisição não encontrada');
    }

    const isFazedor = requisicao.servico?.fazedor?.id_fazedor === fazedorId ||
      requisicao.modelo?.agencia?.fazedor?.id_fazedor === fazedorId;

    if (!isFazedor) {
      throw new ValidationError('Você não tem permissão para aceitar esta requisição');
    }

    if (requisicao.status !== 'pendente') {
      throw new ValidationError(`Requisição já está ${requisicao.status}`);
    }

    const updated = await this.requisicaoRepository.updateStatus(id, 'aceita');

    await this.notificacaoRepository.enviarNotificacaoRequisicao(id, requisicao.id_solicitante, 'aceita');

    logger.info(`Requisição aceita: ${id} por fazedor ${fazedorId}`);
    return updated;
  }

  async recusarRequisicao(id: string, fazedorId: string, motivo?: string): Promise<any> {
    const requisicao = await this.requisicaoRepository.findById(id);
    if (!requisicao) {
      throw new NotFoundError('Requisição não encontrada');
    }

    const isFazedor = requisicao.servico?.fazedor?.id_fazedor === fazedorId ||
      requisicao.modelo?.agencia?.fazedor?.id_fazedor === fazedorId;

    if (!isFazedor) {
      throw new ValidationError('Você não tem permissão para recusar esta requisição');
    }

    if (requisicao.status !== 'pendente') {
      throw new ValidationError(`Requisição já está ${requisicao.status}`);
    }

    const updated = await this.requisicaoRepository.update(id, {
      status: 'recusada',
      observacoes: motivo
    });

    await this.notificacaoRepository.enviarNotificacaoRequisicao(id, requisicao.id_solicitante, 'recusada');

    logger.info(`Requisição recusada: ${id} por fazedor ${fazedorId}`);
    return updated;
  }

  async cancelarRequisicao(id: string, solicitanteId: string): Promise<any> {
    const requisicao = await this.requisicaoRepository.findById(id);
    if (!requisicao) {
      throw new NotFoundError('Requisição não encontrada');
    }

    if (requisicao.id_solicitante !== solicitanteId) {
      throw new ValidationError('Você só pode cancelar suas próprias requisições');
    }

    if (requisicao.status !== 'pendente' && requisicao.status !== 'aceita') {
      throw new ValidationError(`Requisições ${requisicao.status} não podem ser canceladas`);
    }

    const updated = await this.requisicaoRepository.updateStatus(id, 'cancelada');

    if (requisicao.status === 'aceita') {
      const fazedorId = requisicao.servico?.fazedor?.id_fazedor ||
        requisicao.modelo?.agencia?.fazedor?.id_fazedor;
      if (fazedorId) {
        await this.notificacaoRepository.enviarNotificacaoRequisicao(id, fazedorId, 'cancelada');
      }
    }

    logger.info(`Requisição cancelada: ${id} por solicitante ${solicitanteId}`);
    return updated;
  }

  async concluirRequisicao(id: string, fazedorId: string): Promise<any> {
    const requisicao = await this.requisicaoRepository.findById(id);
    if (!requisicao) {
      throw new NotFoundError('Requisição não encontrada');
    }

    const isFazedor = requisicao.servico?.fazedor?.id_fazedor === fazedorId ||
      requisicao.modelo?.agencia?.fazedor?.id_fazedor === fazedorId;

    if (!isFazedor) {
      throw new ValidationError('Você não tem permissão para concluir esta requisição');
    }

    if (requisicao.status !== 'aceita') {
      throw new ValidationError('Apenas requisições aceitas podem ser concluídas');
    }

    const updated = await this.requisicaoRepository.updateStatus(id, 'concluida');

    await this.notificacaoRepository.enviarNotificacaoRequisicao(id, requisicao.id_solicitante, 'concluida');

    logger.info(`Requisição concluída: ${id} por fazedor ${fazedorId}`);
    return updated;
  }

  async getEstatisticas(fazedorId?: string, solicitanteId?: string): Promise<any> {
    return await this.requisicaoRepository.getEstatisticas(fazedorId, solicitanteId);
  }
}
