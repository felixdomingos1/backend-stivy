import { ServicoRepository, ServicoFilters } from '../repositories/servico.repository';
import { FazedorRepository, FazedorFilters } from '../repositories/fazedor.repository';
import { AvaliacaoRepository } from '../repositories/avaliacao.repository';
import { CreateServicoDto, UpdateServicoDto } from '../dtos/fashion.dto';
import { ValidationError, NotFoundError } from '../utils/errors';
import logger from '../utils/logger';

export class FashionService {
  constructor(
    private servicoRepository: ServicoRepository,
    private fazedorRepository: FazedorRepository,
    private avaliacaoRepository: AvaliacaoRepository
  ) { }

  async createServico(fazedorId: string, dto: CreateServicoDto): Promise<any> {
    console.log(fazedorId, dto);

    const fazedor = await this.fazedorRepository.findFazedorByUserId(fazedorId);
    if (!fazedor) {
      throw new NotFoundError('Fazedor não encontrado');
    }

    const servico = await this.servicoRepository.create({
      id_fazedor: fazedor.id_fazedor,
      titulo: dto.titulo,
      descricao: dto.descricao,
      categoria: dto.categoria,
      valor: dto.valor,
      tempo_estimado: dto.tempo_estimado,
      imagem_url: dto.imagem_url,
      imagem_public_id: dto.imagem_public_id
    });

    logger.info(`Serviço criado: ${servico.titulo} - Fazedor: ${fazedor.id_fazedor}`);
    return servico;
  }

  async getFazedorByUserId(userId: string): Promise<any> {
    try {
      const fazedor = await this.fazedorRepository.findFazedorByUserId(userId);
      if (!fazedor) {
        throw new NotFoundError('Fazedor não encontrado');
      }
      return fazedor;
    } catch (error) {
      throw error;
    }
  }
  async getServicoById(id: string): Promise<any> {
    const servico = await this.servicoRepository.findById(id);
    if (!servico) {
      throw new NotFoundError('Serviço não encontrado');
    }
    return servico;
  }

  async listServicos(filters: ServicoFilters, page: number = 1, limit: number = 20): Promise<any> {
    const skip = (page - 1) * limit;
    const [servicos, total] = await Promise.all([
      this.servicoRepository.findAll(filters, skip, limit),
      this.servicoRepository.count(filters)
    ]);

    return {
      data: servicos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async updateServico(id: string, fazedorUserId: string, dto: UpdateServicoDto): Promise<any> {
    const servico = await this.servicoRepository.findById(id);
    if (!servico) {
      throw new NotFoundError('Serviço não encontrado');
    }

    const fazedor = await this.fazedorRepository.findFazedorByUserId(fazedorUserId);
    if (!fazedor || servico.id_fazedor !== fazedor.id_fazedor) {
      throw new ValidationError('Você não tem permissão para editar este serviço');
    }

    const updated = await this.servicoRepository.update(id, dto);
    logger.info(`Serviço atualizado: ${id}`);
    return updated;
  }

  async deleteServico(id: string, fazedorUserId: string): Promise<void> {
    const servico = await this.servicoRepository.findById(id);
    if (!servico) {
      throw new NotFoundError('Serviço não encontrado');
    }

    const fazedor = await this.fazedorRepository.findFazedorByUserId(fazedorUserId);
    if (!fazedor || servico.id_fazedor !== fazedor.id_fazedor) {
      throw new ValidationError('Você não tem permissão para excluir este serviço');
    }

    await this.servicoRepository.delete(id);
    logger.info(`Serviço excluído: ${id}`);
  }

  async getFazedorById(fazedorUserId: string): Promise<any> {
    const fazedor = await this.fazedorRepository.findFazedorWithDetails(fazedorUserId);
    if (!fazedor) {
      throw new NotFoundError('Fazedor não encontrado');
    }
    const estatisticas = await this.avaliacaoRepository.getEstatisticas(fazedor.id_fazedor);
    const servicos = await this.servicoRepository.findByFazedor(fazedor.id_fazedor);

    return {
      ...fazedor,
      estatisticas,
      servicos
    };
  }

  async listFazedores(filters: FazedorFilters, page: number = 1, limit: number = 20): Promise<any> {
    const skip = (page - 1) * limit;
    const [fazedores, total] = await Promise.all([
      this.fazedorRepository.findAll(filters, skip, limit),
      this.fazedorRepository.count(filters)
    ]);

    return {
      data: fazedores,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getServicosDoFazedor(fazedorUserId: string): Promise<any[]> {
    const fazedor = await this.fazedorRepository.findFazedorByUserId(fazedorUserId);
    if (!fazedor) {
      throw new NotFoundError('Fazedor não encontrado');
    }
    return await this.servicoRepository.findByFazedor(fazedor.id_fazedor);
  }

  async avaliarFazedor(avaliadorUserId: string, fazedorUserId: string, nota: number, comentario?: string): Promise<any> {
    if (nota < 1 || nota > 5) {
      throw new ValidationError('Nota deve ser entre 1 e 5');
    }

    const fazedor = await this.fazedorRepository.findFazedorByUserId(fazedorUserId);
    if (!fazedor) {
      throw new NotFoundError('Fazedor não encontrado');
    }

    const jaAvaliou = await this.avaliacaoRepository.jaAvaliou(avaliadorUserId, fazedor.id_fazedor);
    if (jaAvaliou) {
      throw new ValidationError('Você já avaliou este fazedor');
    }

    const avaliacao = await this.avaliacaoRepository.create({
      id_avaliador: avaliadorUserId,
      id_avaliado: fazedor.id_fazedor,
      nota,
      comentario
    });

    logger.info(`Avaliação criada: ${avaliadorUserId} -> ${fazedor.id_fazedor} (${nota})`);
    return avaliacao;
  }

  async getAvaliacoesDoFazedor(fazedorUserId: string, page: number = 1, limit: number = 20): Promise<any> {
    const fazedor = await this.fazedorRepository.findFazedorByUserId(fazedorUserId);
    if (!fazedor) {
      throw new NotFoundError('Fazedor não encontrado');
    }

    const skip = (page - 1) * limit;
    const [avaliacoes, total] = await Promise.all([
      this.avaliacaoRepository.findByAvaliado(fazedor.id_fazedor, {}, skip, limit),
      this.avaliacaoRepository.countByAvaliado(fazedor.id_fazedor)
    ]);

    return {
      data: avaliacoes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getEstatisticasFazedor(fazedorUserId: string): Promise<any> {
    const fazedor = await this.fazedorRepository.findFazedorByUserId(fazedorUserId);
    if (!fazedor) {
      throw new NotFoundError('Fazedor não encontrado');
    }

    const [estatisticasAvaliacoes, estatisticasServicos] = await Promise.all([
      this.avaliacaoRepository.getEstatisticas(fazedor.id_fazedor),
      this.servicoRepository.getEstatisticas(fazedor.id_fazedor)
    ]);

    return {
      avaliacoes: estatisticasAvaliacoes,
      servicos: estatisticasServicos,
      perfil: {
        tipo: fazedor.tipo_fazedor,
        status_aprovacao: fazedor.status_aprovacao,
        data_cadastro: fazedor.usuario?.data_cadastro
      }
    };
  }

  async getCategoriasServicos(): Promise<string[]> {
    return await this.servicoRepository.getCategorias();
  }

  async getTiposFazedores(): Promise<string[]> {
    return ['agencia', 'estilista', 'maquiador', 'fotografo', 'modelo_freelancer'];
  }
}
