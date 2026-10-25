import { ReacaoTipo } from '@prisma/client';
import { ServicoComentarioRepository } from '../repositories/servico-comentario.repository';
import { ServicoRepository } from '../repositories/servico.repository';
import { NotificacaoRepository } from '../repositories/notificacao.repository';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';
import prisma from '../config/database';

const TIPOS_REACAO = ['like', 'love', 'wow', 'sad', 'angry'];

export class ServicoComentarioService {
  private notificacaoRepository = new NotificacaoRepository();

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
    const texto = typeof data.comentario === 'string' ? data.comentario.trim() : '';
    if (!texto) {
      throw new ValidationError('Comentário é obrigatório');
    }
    if (texto.length > 2000) {
      throw new ValidationError('Comentário deve ter no máximo 2000 caracteres');
    }

    const servico = await this.servicoRepository.findById(data.id_servico);
    if (!servico) {
      throw new NotFoundError('Serviço não encontrado');
    }

    let parentAutor: string | null = null;
    if (data.parent_id) {
      const parent = await this.comentarioRepository.findComentarioById(data.parent_id);
      if (!parent || parent.id_servico !== data.id_servico) {
        throw new ValidationError('Comentário pai inválido');
      }
      parentAutor = parent.id_usuario;
    }

    const comentario = await this.comentarioRepository.create({ ...data, comentario: texto });

    const autor = (comentario as any).usuario?.nome ?? 'Alguém';
    const donoServico = servico.fazedor.usuario.id_usuario;
    const destinatarios = new Set<string>();
    if (donoServico !== data.id_usuario) destinatarios.add(donoServico);
    if (parentAutor && parentAutor !== data.id_usuario) destinatarios.add(parentAutor);
    for (const id_usuario of destinatarios) {
      await this.notificacaoRepository.createSafe({
        id_usuario,
        titulo: id_usuario === parentAutor ? 'Nova resposta ao seu comentário' : 'Novo comentário',
        mensagem: `${autor} comentou em "${servico.titulo}": ${texto.length > 80 ? texto.slice(0, 80) + '...' : texto}`,
        tipo: 'comentario',
        link: `/servico/${data.id_servico}`,
        id_ator: data.id_usuario
      });
    }

    return comentario;
  }

  async findByServico(id_servico: string, page: number, limit: number): Promise<any> {
    return await this.comentarioRepository.findByServico(id_servico, page, limit);
  }

  async addReacao(data: {
    id_comentario: string;
    id_usuario: string;
    tipo: ReacaoTipo;
  }): Promise<void> {
    if (!TIPOS_REACAO.includes(data.tipo)) {
      throw new ValidationError('Tipo de reação inválido');
    }
    const comentario = await this.comentarioRepository.findComentarioById(data.id_comentario);
    if (!comentario) {
      throw new NotFoundError('Comentário não encontrado');
    }
    await this.comentarioRepository.addReacao(data);
  }

  async removeReacao(id_comentario: string, id_usuario: string): Promise<void> {
    await this.comentarioRepository.removeReacao(id_comentario, id_usuario);
  }

  /** Pode apagar: o autor do comentário ou o dono do serviço (moderação). */
  async delete(id_comentario: string, id_usuario: string): Promise<void> {
    const comentario = await this.comentarioRepository.findComentarioById(id_comentario);
    if (!comentario) {
      throw new NotFoundError('Comentário não encontrado');
    }

    if (comentario.id_usuario !== id_usuario) {
      const servico = await prisma.servico.findUnique({
        where: { id_servico: comentario.id_servico },
        select: { fazedor: { select: { id_usuario: true } } }
      });
      if (servico?.fazedor.id_usuario !== id_usuario) {
        throw new ForbiddenError('Você não tem permissão para deletar este comentário');
      }
    }

    await this.comentarioRepository.delete(id_comentario);
  }
}
