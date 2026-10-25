import { ReacaoTipo } from '@prisma/client';
import { ServicoReacaoRepository } from '../repositories/servico-reacao.repository';
import { NotificacaoRepository } from '../repositories/notificacao.repository';
import { ValidationError, NotFoundError } from '../utils/errors';
import prisma from '../config/database';

export class ServicoReacaoService {
  private notificacaoRepository = new NotificacaoRepository();

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

    const servico = await prisma.servico.findUnique({
      where: { id_servico: data.id_servico },
      select: { titulo: true, fazedor: { select: { id_usuario: true } } }
    });
    if (!servico) {
      throw new NotFoundError('Serviço não encontrado');
    }

    const anterior = await this.reacaoRepository.getUserReacao(data.id_servico, data.id_usuario);
    await this.reacaoRepository.addReacao(data);

    // Notificar apenas a primeira reação (não a cada troca de tipo)
    if (!anterior && servico.fazedor.id_usuario !== data.id_usuario) {
      const usuario = await prisma.usuario.findUnique({ where: { id_usuario: data.id_usuario }, select: { nome: true } });
      await this.notificacaoRepository.createSafe({
        id_usuario: servico.fazedor.id_usuario,
        titulo: 'Nova reação',
        mensagem: `${usuario?.nome ?? 'Alguém'} reagiu à sua publicação "${servico.titulo}".`,
        tipo: 'reacao',
        link: `/servico/${data.id_servico}`,
        id_ator: data.id_usuario
      });
    }
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
