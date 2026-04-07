import { NotificacaoRepository, CreateNotificacaoData, NotificacaoFilters } from '../repositories/notificacao.repository';
import { ValidationError, NotFoundError } from '../utils/errors';
import logger from '../utils/logger';
import { NotificacaoTipo } from '@prisma/client';

export class NotificationService {
  constructor(
    private notificacaoRepository: NotificacaoRepository
  ) { }

  async criarNotificacao(data: CreateNotificacaoData): Promise<any> {
    try {
      if (!Object.values(NotificacaoTipo).includes(data.tipo as any)) {
        throw new ValidationError('Tipo de notificação inválido');
      }

      const notificacao = await this.notificacaoRepository.create(data);

      logger.info(`Notificação criada: ${notificacao.titulo} - Usuário: ${data.id_usuario}`);
      return notificacao;
    } catch (error) {
      throw error;
    }
  }

  async criarMultiplasNotificacoes(notificacoes: CreateNotificacaoData[]): Promise<number> {
    try {
      for (const notif of notificacoes) {
        if (!Object.values(NotificacaoTipo).includes(notif.tipo as any)) {
          throw new ValidationError(`Tipo de notificação inválido: ${notif.tipo}`);
        }
      }

      const count = await this.notificacaoRepository.createMany(notificacoes);
      logger.info(`${count} notificações criadas em massa`);
      return count;
    } catch (error: any) {
      throw error;
    }
  }

  async listarNotificacoes(
    id_usuario: string,
    filters?: NotificacaoFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<any> {
    try {
      const skip = (page - 1) * limit;
      const [notificacoes, total] = await Promise.all([
        this.notificacaoRepository.findByUsuario(id_usuario, filters, skip, limit),
        this.notificacaoRepository.countByUsuario(id_usuario, filters?.lida)
      ]);

      return {
        data: notificacoes,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error: any) {
      logger.error('Erro ao listar notificações:', error);
      throw error;
    }
  }

  async buscarNotificacaoPorId(id: string, id_usuario: string): Promise<any> {
    try {
      const notificacao = await this.notificacaoRepository.findById(id);

      if (!notificacao) {
        throw new NotFoundError('Notificação não encontrada');
      }

      if (notificacao.id_usuario !== id_usuario) {
        throw new ValidationError('Acesso negado: esta notificação não pertence ao usuário');
      }

      return notificacao;
    } catch (error: any) {
      throw error;
    }
  }

  async marcarComoLida(id: string, id_usuario: string): Promise<any> {
    try {
      const notificacao = await this.notificacaoRepository.findById(id);

      if (!notificacao) {
        throw new NotFoundError('Notificação não encontrada');
      }

      if (notificacao.id_usuario !== id_usuario) {
        throw new ValidationError('Acesso negado: esta notificação não pertence ao usuário');
      }

      if (notificacao.lida) {
        throw new ValidationError('Notificação já está marcada como lida');
      }

      const notificacaoAtualizada = await this.notificacaoRepository.markAsRead(id);

      logger.info(`Notificação marcada como lida: ${id}`);

      return notificacaoAtualizada;
    } catch (error: any) {
      throw error;
    }
  }

  async marcarTodasComoLidas(id_usuario: string): Promise<{ count: number; message: string }> {
    try {
      const count = await this.notificacaoRepository.markAllAsRead(id_usuario);

      logger.info(`Todas notificações marcadas como lidas para usuário: ${id_usuario}`);

      return {
        count,
        message: `${count} notificação(ões) marcada(s) como lida(s)`
      };
    } catch (error: any) {
      logger.error('Erro ao marcar todas notificações como lidas:', error);
      throw error;
    }
  }

  async removerNotificacao(id: string, id_usuario: string): Promise<{ message: string }> {
    try {
      const notificacao = await this.notificacaoRepository.findById(id);

      if (!notificacao) {
        throw new NotFoundError('Notificação não encontrada');
      }

      if (notificacao.id_usuario !== id_usuario) {
        throw new ValidationError('Acesso negado: esta notificação não pertence ao usuário');
      }

      await this.notificacaoRepository.delete(id);

      logger.info(`Notificação removida: ${id}`);

      return { message: 'Notificação removida com sucesso' };
    } catch (error: any) {
      throw error;
    }
  }

  async listarNaoLidas(id_usuario: string): Promise<any[]> {
    try {
      return await this.notificacaoRepository.getNaoLidas(id_usuario);
    } catch (error: any) {
      logger.error('Erro ao listar notificações não lidas:', error);
      throw error;
    }
  }

  async getUltimasNotificacoes(id_usuario: string, limit: number = 10): Promise<any[]> {
    try {
      return await this.notificacaoRepository.getUltimasNotificacoes(id_usuario, limit);
    } catch (error: any) {
      logger.error('Erro ao buscar últimas notificações:', error);
      throw error;
    }
  }

  async limparNotificacoesAntigas(id_usuario: string, dias: number = 30): Promise<{ count: number; message: string }> {
    try {
      const count = await this.notificacaoRepository.deleteOld(id_usuario, dias);

      logger.info(`${count} notificações antigas removidas para usuário: ${id_usuario}`);

      return {
        count,
        message: `${count} notificação(ões) antiga(s) removida(s)`
      };
    } catch (error: any) {
      logger.error('Erro ao limpar notificações antigas:', error);
      throw error;
    }
  }

  async getEstatisticas(id_usuario: string): Promise<any> {
    try {
      const estatisticas = await this.notificacaoRepository.getEstatisticas(id_usuario);
      const ultimasNotificacoes = await this.getUltimasNotificacoes(id_usuario, 5);

      return {
        ...estatisticas,
        ultimas_notificacoes: ultimasNotificacoes
      };
    } catch (error: any) {
      logger.error('Erro ao buscar estatísticas:', error);
      throw error;
    }
  }

  async enviarNotificacaoEvento(
    id_evento: string,
    ids_usuarios: string[],
    titulo: string,
    mensagem: string
  ): Promise<void> {
    try {
      const notificacoes = ids_usuarios.map(id_usuario => ({
        id_usuario,
        titulo,
        mensagem,
        tipo: 'evento' as NotificacaoTipo,
        link: `/eventos/${id_evento}`
      }));

      await this.criarMultiplasNotificacoes(notificacoes);

      logger.info(`Notificações de evento enviadas para ${ids_usuarios.length} usuários`);
    } catch (error: any) {
      logger.error('Erro ao enviar notificações de evento:', error);
      throw error;
    }
  }

  async enviarNotificacaoRequisicao(
    id_requisicao: string,
    id_usuario: string,
    status: string
  ): Promise<void> {
    try {
      let titulo = '';
      let mensagem = '';

      switch (status) {
        case 'aceita':
          titulo = 'Requisição Aceita!';
          mensagem = 'Sua requisição foi aceita. Aguarde o contato do profissional.';
          break;
        case 'recusada':
          titulo = 'Requisição Recusada';
          mensagem = 'Infelizmente sua requisição foi recusada.';
          break;
        case 'concluida':
          titulo = 'Requisição Concluída';
          mensagem = 'Sua requisição foi concluída com sucesso!';
          break;
        default:
          titulo = 'Atualização da Requisição';
          mensagem = `Sua requisição está com status: ${status}`;
      }

      await this.criarNotificacao({
        id_usuario,
        titulo,
        mensagem,
        tipo: 'requisicao' as NotificacaoTipo,
        link: `/requisicoes/${id_requisicao}`
      });

      logger.info(`Notificação de requisição enviada: ${id_requisicao} - ${status}`);
    } catch (error: any) {
      logger.error('Erro ao enviar notificação de requisição:', error);
      throw error;
    }
  }

  async enviarNotificacaoSistema(id_usuario: string, titulo: string, mensagem: string, link?: string): Promise<void> {
    try {
      await this.criarNotificacao({
        id_usuario,
        titulo,
        mensagem,
        tipo: 'sistema' as NotificacaoTipo,
        link
      });

      logger.info(`Notificação de sistema enviada para usuário: ${id_usuario}`);
    } catch (error: any) {
      logger.error('Erro ao enviar notificação de sistema:', error);
      throw error;
    }
  }

  async enviarNotificacaoMensagem(id_usuario: string, titulo: string, mensagem: string, link?: string): Promise<void> {
    try {
      await this.criarNotificacao({
        id_usuario,
        titulo,
        mensagem,
        tipo: 'mensagem' as NotificacaoTipo,
        link
      });

      logger.info(`Notificação de mensagem enviada para usuário: ${id_usuario}`);
    } catch (error: any) {
      logger.error('Erro ao enviar notificação de mensagem:', error);
      throw error;
    }
  }
}
