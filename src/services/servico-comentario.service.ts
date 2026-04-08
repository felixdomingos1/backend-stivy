import { ReacaoTipo } from '@prisma/client';
import { ServicoComentarioRepository } from '../repositories/servico-comentario.repository';
import { ServicoRepository } from '../repositories/servico.repository';
import { ValidationError, NotFoundError } from '../utils/errors';

export class ServicoComentarioService {
  constructor(
    private comentarioRepository: ServicoComentarioRepository,
    private servicoRepository: ServicoRepository
  ) { }

  async create(data: {
    id_servico: string;
    id_usuario: string;
    comentario: string;
    parent_id?: string;
  }): Promise<any> {
    const servico = await this.servicoRepository.findById(data.id_servico);
    if (!servico) {
      throw new NotFoundError('Serviço não encontrado');
    }

    return await this.comentarioRepository.create(data);
  }

  async findByServico(id_servico: string, page: number, limit: number): Promise<any> {
    return await this.comentarioRepository.findByServico(id_servico, page, limit);
  }

  async addReacao(data: {
    id_comentario: string;
    id_usuario: string;
    tipo: ReacaoTipo;
  }): Promise<void> {
    await this.comentarioRepository.addReacao(data);
  }

  async removeReacao(id_comentario: string, id_usuario: string): Promise<void> {
    await this.comentarioRepository.removeReacao(id_comentario, id_usuario);
  }

  async delete(id_comentario: string, id_usuario: string): Promise<void> {
    const comentario = await this.comentarioRepository.findComentarioById(id_comentario);
    if (!comentario) {
      throw new NotFoundError('Comentário não encontrado');
    }

    if (comentario.id_usuario !== id_usuario) {
      throw new ValidationError('Você não tem permissão para deletar este comentário');
    }

    await this.comentarioRepository.delete(id_comentario);
  }
}
