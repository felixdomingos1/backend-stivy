import { ReacaoTipo } from '@prisma/client';
import { ServicoReacaoRepository } from '../repositories/servico-reacao.repository';
import { ValidationError } from '../utils/errors';

export class ServicoReacaoService {
  constructor(
    private reacaoRepository: ServicoReacaoRepository
  ) { }

  async addReacao(data: {
    id_servico: string;
    id_usuario: string;
    tipo: ReacaoTipo;
  }): Promise<void> {
    const tiposValidos = ['like', 'love', 'wow', 'sad', 'angry'];
    if (!tiposValidos.includes(data.tipo)) {
      throw new ValidationError('Tipo de reação inválido');
    }

    await this.reacaoRepository.addReacao(data);
  }

  async removeReacao(id_servico: string, id_usuario: string): Promise<void> {
    await this.reacaoRepository.removeReacao(id_servico, id_usuario);
  }

  async getReacoesCount(id_servico: string): Promise<Record<string, number>> {
    return await this.reacaoRepository.getReacoesCount(id_servico);
  }

  async getUserReacao(id_servico: string, id_usuario: string): Promise<string | null> {
    return await this.reacaoRepository.getUserReacao(id_servico, id_usuario);
  }
}
