import { ServicoCompartilhamentoRepository } from '../repositories/servico-compartilhamento.repository';
import { ServicoRepository } from '../repositories/servico.repository';
import { NotFoundError } from '../utils/errors';

export class ServicoCompartilhamentoService {
  constructor(
    private compartilhamentoRepository: ServicoCompartilhamentoRepository,
    private servicoRepository?: ServicoRepository
  ) { }

  async create(data: {
    id_servico: string;
    id_usuario: string;
    plataforma?: string;
  }): Promise<any> {
    // Verificar se serviço existe (opcional, se tiver o repositório)
    if (this.servicoRepository) {
      const servico = await this.servicoRepository.findById(data.id_servico);
      if (!servico) {
        throw new NotFoundError('Serviço não encontrado');
      }
    }

    return await this.compartilhamentoRepository.create(data);
  }

  async getCountByServico(id_servico: string): Promise<number> {
    return await this.compartilhamentoRepository.getCountByServico(id_servico);
  }

  async getCompartilhamentosByServico(id_servico: string, page: number = 1, limit: number = 20): Promise<any> {
    return await this.compartilhamentoRepository.findByServico(id_servico, page, limit);
  }
}
