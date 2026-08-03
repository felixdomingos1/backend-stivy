import { Server as SocketServer } from 'socket.io';
import { ChatRepository, CreateConversaData } from '../repositories/chat.repository';
import { NotificacaoRepository } from '../repositories/notificacao.repository';
import { ValidationError, NotFoundError } from '../utils/errors';
import logger from '../utils/logger';

export class ChatService {
  constructor(
    private chatRepository: ChatRepository,
    private notificacaoRepository: NotificacaoRepository
  ) {}

  async listarConversas(id_usuario: string) {
    try {
      const conversas = await this.chatRepository.findConversationsByUser(id_usuario);
      return conversas.map((c) => ({
        id_conversa: c.id_conversa,
        tipo: c.tipo,
        titulo: c.titulo,
        criada_em: c.criada_em,
        atualizada_em: c.atualizada_em,
        ultima_mensagem: c.mensagens[0] || null,
        participantes: c.participantes,
      }));
    } catch (error: any) {
      logger.error('Erro ao listar conversas:', error);
      throw error;
    }
  }

  async criarConversa(data: CreateConversaData, id_usuario_criador: string) {
    try {
      const participantes = [...new Set([id_usuario_criador, ...data.participantes])];

      if (participantes.length < 2) {
        throw new ValidationError('Conversa deve ter pelo menos 2 participantes');
      }

      if (data.tipo === 'direct' && participantes.length > 2) {
        throw new ValidationError('Conversa direct deve ter exatamente 2 participantes');
      }

      if (data.tipo === 'direct') {
        const existente = await this.chatRepository.findExistingDirectConversation(participantes);
        if (existente) {
          return existente;
        }
      }

      if (data.tipo === 'grupo' && !data.titulo) {
        throw new ValidationError('Conversa em grupo deve ter um título');
      }

      const conversa = await this.chatRepository.createConversation({
        ...data,
        participantes,
      });

      logger.info(`Conversa criada: ${conversa.id_conversa} - Tipo: ${data.tipo}`);
      return conversa;
    } catch (error: any) {
      logger.error('Erro ao criar conversa:', error);
      throw error;
    }
  }

  async buscarConversa(id_conversa: string, id_usuario: string) {
    try {
      const conversa = await this.chatRepository.findConversationById(id_conversa);

      if (!conversa) {
        throw new NotFoundError('Conversa não encontrada');
      }

      const isParticipante = conversa.participantes.some(
        (p) => p.id_usuario === id_usuario
      );

      if (!isParticipante) {
        throw new ValidationError('Acesso negado: você não é participante desta conversa');
      }

      return conversa;
    } catch (error: any) {
      throw error;
    }
  }

  async enviarMensagem(
    id_conversa: string,
    id_remetente: string,
    conteudo: string,
    tipo: string = 'texto',
    io?: SocketServer
  ) {
    try {
      const conversa = await this.chatRepository.findConversationById(id_conversa);

      if (!conversa) {
        throw new NotFoundError('Conversa não encontrada');
      }

      const isParticipante = conversa.participantes.some(
        (p) => p.id_usuario === id_remetente
      );

      if (!isParticipante) {
        throw new ValidationError('Acesso negado: você não é participante desta conversa');
      }

      const mensagem = await this.chatRepository.createMessage({
        id_conversa,
        id_remetente,
        conteudo,
        tipo,
      });

      // Emit via socket
      if (io) {
        io.to(`chat:${id_conversa}`).emit('chat:message', mensagem);
      }

      // Criar notificações para os outros participantes
      const outrosParticipantes = conversa.participantes.filter(
        (p) => p.id_usuario !== id_remetente
      );

      for (const participante of outrosParticipantes) {
        await this.notificacaoRepository.create({
          id_usuario: participante.id_usuario,
          titulo: 'Nova mensagem',
          mensagem: conteudo.length > 100 ? conteudo.substring(0, 100) + '...' : conteudo,
          tipo: 'mensagem',
          link: `/chat/${id_conversa}`,
        });

        if (io) {
          io.to(`user:${participante.id_usuario}`).emit('chat:newMessage', {
            id_conversa,
            mensagem,
          });
        }
      }

      logger.info(
        `Mensagem enviada na conversa ${id_conversa} pelo usuário ${id_remetente}`
      );

      return mensagem;
    } catch (error: any) {
      logger.error('Erro ao enviar mensagem:', error);
      throw error;
    }
  }

  async listarMensagens(
    id_conversa: string,
    id_usuario: string,
    page: number = 1,
    limit: number = 50
  ) {
    try {
      const conversa = await this.chatRepository.findConversationById(id_conversa);

      if (!conversa) {
        throw new NotFoundError('Conversa não encontrada');
      }

      const isParticipante = conversa.participantes.some(
        (p) => p.id_usuario === id_usuario
      );

      if (!isParticipante) {
        throw new ValidationError('Acesso negado: você não é participante desta conversa');
      }

      const skip = (page - 1) * limit;
      const { messages, total } = await this.chatRepository.findMessagesByConversation(
        id_conversa,
        skip,
        limit
      );

      return {
        data: messages.reverse(),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      logger.error('Erro ao listar mensagens:', error);
      throw error;
    }
  }

  async marcarMensagemComoLida(id_mensagem: string, id_usuario: string, io?: SocketServer) {
    try {
      const mensagem = await this.chatRepository.markMessageAsRead(id_mensagem, id_usuario);

      if (!mensagem) {
        throw new NotFoundError('Mensagem não encontrada');
      }

      if (io) {
        io.to(`chat:${mensagem.id_conversa}`).emit('chat:read', {
          id_mensagem,
          id_conversa: mensagem.id_conversa,
          lida: true,
        });
      }

      return mensagem;
    } catch (error: any) {
      logger.error('Erro ao marcar mensagem como lida:', error);
      throw error;
    }
  }

  async marcarTudoComoLido(id_conversa: string, id_usuario: string, io?: SocketServer) {
    try {
      const conversa = await this.chatRepository.findConversationById(id_conversa);

      if (!conversa) {
        throw new NotFoundError('Conversa não encontrada');
      }

      const isParticipante = conversa.participantes.some(
        (p) => p.id_usuario === id_usuario
      );

      if (!isParticipante) {
        throw new ValidationError('Acesso negado: você não é participante desta conversa');
      }

      const count = await this.chatRepository.markAllAsRead(id_conversa, id_usuario);

      if (io) {
        io.to(`chat:${id_conversa}`).emit('chat:read', {
          id_conversa,
          lida: true,
        });
      }

      logger.info(
        `${count} mensagens marcadas como lidas na conversa ${id_conversa} pelo usuário ${id_usuario}`
      );

      return { count, message: `${count} mensagem(ns) marcada(s) como lida(s)` };
    } catch (error: any) {
      logger.error('Erro ao marcar todas como lidas:', error);
      throw error;
    }
  }

  async getUnreadCount(id_usuario: string) {
    try {
      return await this.chatRepository.getUnreadCount(id_usuario);
    } catch (error: any) {
      logger.error('Erro ao obter contagem de não lidas:', error);
      throw error;
    }
  }

  async deletarConversa(id_conversa: string, id_usuario: string) {
    try {
      const conversa = await this.chatRepository.findConversationById(id_conversa);

      if (!conversa) {
        throw new NotFoundError('Conversa não encontrada');
      }

      const isParticipante = conversa.participantes.some(
        (p) => p.id_usuario === id_usuario
      );

      if (!isParticipante) {
        throw new ValidationError('Acesso negado: você não é participante desta conversa');
      }

      await this.chatRepository.deleteConversation(id_conversa);

      logger.info(`Conversa ${id_conversa} deletada pelo usuário ${id_usuario}`);

      return { message: 'Conversa deletada com sucesso' };
    } catch (error: any) {
      logger.error('Erro ao deletar conversa:', error);
      throw error;
    }
  }
}
