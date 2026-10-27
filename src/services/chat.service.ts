import { Prisma } from '@prisma/client';
import { ChatRepository, CreateConversaData } from '../repositories/chat.repository';
import { NotificacaoRepository } from '../repositories/notificacao.repository';
import { ValidationError, NotFoundError } from '../utils/errors';
import { ForbiddenError } from './authorization.service';
import { getIO, emitToUser, SocketEmitter } from '../config/socket';
import logger from '../utils/logger';

export const CHAT_EVENTS = {
  NEW_MESSAGE: 'chat:newMessage',
  READ: 'chat:read',
  /** Mensagem alterada (apagada para todos ou reacções). */
  MESSAGE_UPDATED: 'chat:messageUpdated',
} as const;

type Participante = {
  id_usuario: string;
  ultima_leitura: Date | null;
  usuario: { id_usuario: string; nome: string; foto_perfil: string | null; tipo?: string; fazedor?: { id_fazedor: string } | null };
};

export type RelacaoContato = 'seguindo' | 'seguidor' | 'cliente' | 'sugestao';

export class ChatService {
  constructor(
    private chatRepository: ChatRepository,
    private notificacaoRepository: NotificacaoRepository
  ) {}

  private formatParticipantes(participantes: Participante[]) {
    return participantes.map((p) => ({
      id_usuario: p.usuario.id_usuario,
      nome: p.usuario.nome,
      foto_perfil: p.usuario.foto_perfil,
      tipo: p.usuario.tipo ?? null,
      id_fazedor: p.usuario.fazedor?.id_fazedor ?? null,
    }));
  }

  private formatConversa(c: any, nao_lidas = 0) {
    return {
      id_conversa: c.id_conversa,
      tipo: c.tipo,
      titulo: c.titulo,
      criada_em: c.criada_em,
      atualizada_em: c.atualizada_em,
      participantes: this.formatParticipantes(c.participantes || []),
      ultima_mensagem: c.mensagens?.[0] || null,
      nao_lidas,
    };
  }

  private async getConversaComoParticipante(id_conversa: string, id_usuario: string) {
    const conversa = await this.chatRepository.findConversationById(id_conversa);

    if (!conversa) {
      throw new NotFoundError('Conversa não encontrada');
    }

    const isParticipante = conversa.participantes.some((p) => p.id_usuario === id_usuario);
    if (!isParticipante) {
      throw new ForbiddenError('Acesso negado: você não é participante desta conversa');
    }

    return conversa;
  }

  /** Emite para a sala da conversa e para a sala pessoal de cada participante (sem duplicados). */
  private emitParaConversa(id_conversa: string, participantes: string[], event: string, payload: any) {
    const io = getIO();
    if (!io) return;
    try {
      io.to([`chat:${id_conversa}`, ...participantes.map((id) => `user:${id}`)]).emit(event, payload);
    } catch (error) {
      logger.warn(`[CHAT] Falha ao emitir ${event}:`, error);
    }
  }

  async listarConversas(id_usuario: string) {
    try {
      const conversas = await this.chatRepository.findConversationsByUser(id_usuario);
      return await Promise.all(
        conversas.map(async (c) => {
          const eu = c.participantes.find((p) => p.id_usuario === id_usuario);
          const naoLidas = await this.chatRepository.countUnread(
            c.id_conversa,
            id_usuario,
            eu?.ultima_leitura ?? null
          );
          return this.formatConversa(c, naoLidas);
        })
      );
    } catch (error: any) {
      logger.error('Erro ao listar conversas:', error);
      throw error;
    }
  }

  async criarConversa(data: CreateConversaData, id_usuario_criador: string) {
    try {
      const tipo = data.tipo || 'direct';
      const participantes = [...new Set([id_usuario_criador, ...(data.participantes || [])])];

      if (participantes.length < 2) {
        throw new ValidationError('Conversa deve ter pelo menos 2 participantes');
      }

      if (tipo === 'direct' && participantes.length > 2) {
        throw new ValidationError('Conversa direct deve ter exatamente 2 participantes');
      }

      if (tipo === 'grupo' && !data.titulo) {
        throw new ValidationError('Conversa em grupo deve ter um título');
      }

      const existentes = await this.chatRepository.countExistingUsers(participantes);
      if (existentes !== participantes.length) {
        throw new NotFoundError('Um ou mais participantes não existem');
      }

      if (tipo === 'direct') {
        const existente = await this.chatRepository.findExistingDirectConversation(participantes);
        if (existente) {
          return { ...this.formatConversa(existente), reutilizada: true };
        }
      }

      const conversa = await this.chatRepository.createConversation({
        ...data,
        tipo,
        participantes,
      });

      logger.info(`Conversa criada: ${conversa.id_conversa} - Tipo: ${tipo}`);
      return { ...this.formatConversa(conversa), reutilizada: false };
    } catch (error: any) {
      logger.error('Erro ao criar conversa:', error);
      throw error;
    }
  }

  /**
   * Cria (ou reutiliza) uma conversa direct entre dois utilizadores e, opcionalmente,
   * adiciona uma mensagem de sistema. Usado ao aceitar uma requisição.
   */
  async obterOuCriarConversaDirect(id_usuario_a: string, id_usuario_b: string, mensagemSistema?: string) {
    if (id_usuario_a === id_usuario_b) {
      throw new ValidationError('Não é possível conversar consigo próprio');
    }
    let conversa: any = await this.chatRepository.findExistingDirectConversation([id_usuario_a, id_usuario_b]);
    if (!conversa) {
      conversa = await this.chatRepository.createConversation({
        tipo: 'direct',
        participantes: [id_usuario_a, id_usuario_b],
      });
    }
    if (mensagemSistema) {
      const mensagem = await this.chatRepository.createMessage({
        id_conversa: conversa.id_conversa,
        id_remetente: id_usuario_a,
        conteudo: mensagemSistema,
        tipo: 'sistema',
      });
      this.emitParaConversa(conversa.id_conversa, [id_usuario_a, id_usuario_b], CHAT_EVENTS.NEW_MESSAGE, mensagem);
    }
    return conversa.id_conversa as string;
  }

  async buscarConversa(id_conversa: string, id_usuario: string) {
    const conversa = await this.getConversaComoParticipante(id_conversa, id_usuario);
    const eu = conversa.participantes.find((p) => p.id_usuario === id_usuario);
    const naoLidas = await this.chatRepository.countUnread(id_conversa, id_usuario, eu?.ultima_leitura ?? null);
    return this.formatConversa(conversa, naoLidas);
  }

  async enviarMensagem(
    id_conversa: string,
    id_remetente: string,
    conteudo: string | undefined,
    tipo: string = 'texto',
    midia_url?: string | null,
    id_resposta?: string | null
  ) {
    try {
      const texto = (conteudo ?? '').trim();
      const tipoFinal = midia_url ? 'imagem' : 'texto';
      if (tipo && !['texto', 'imagem'].includes(tipo)) {
        throw new ValidationError('Tipo de mensagem inválido');
      }
      if (!midia_url && !texto) {
        throw new ValidationError('Conteúdo é obrigatório');
      }
      if (texto.length > 5000) {
        throw new ValidationError('Conteúdo deve ter no máximo 5000 caracteres');
      }

      const conversa = await this.getConversaComoParticipante(id_conversa, id_remetente);

      // A mensagem citada tem de ser desta conversa.
      if (id_resposta) {
        const citada = await this.chatRepository.findMessageById(id_resposta);
        if (!citada || citada.id_conversa !== id_conversa) {
          throw new ValidationError('Mensagem a responder inválida');
        }
      }

      const mensagem = await this.chatRepository.createMessage({
        id_conversa,
        id_remetente,
        conteudo: texto,
        tipo: tipoFinal,
        midia_url: midia_url ?? null,
        id_resposta: id_resposta || null,
      });

      const ids = conversa.participantes.map((p) => p.id_usuario);
      this.emitParaConversa(id_conversa, ids, CHAT_EVENTS.NEW_MESSAGE, mensagem);

      // Notificação persistente apenas para quem está offline (evita spam a quem está ligado)
      const remetenteNome = conversa.participantes.find((p) => p.id_usuario === id_remetente)?.usuario.nome ?? 'Alguém';
      const preview = tipoFinal === 'imagem' ? '📷 Imagem' : (texto.length > 100 ? texto.substring(0, 100) + '...' : texto);
      for (const participante of conversa.participantes) {
        if (participante.id_usuario === id_remetente) continue;
        if (SocketEmitter.isUserOnline(participante.id_usuario)) continue;
        await this.notificacaoRepository.createSafe({
          id_usuario: participante.id_usuario,
          titulo: `Nova mensagem de ${remetenteNome}`.slice(0, 100),
          mensagem: preview,
          tipo: 'mensagem',
          link: `/chat/${id_conversa}`,
          id_ator: id_remetente
        });
      }

      logger.info(`Mensagem enviada na conversa ${id_conversa} pelo usuário ${id_remetente}`);

      return mensagem;
    } catch (error: any) {
      logger.error('Erro ao enviar mensagem:', error);
      throw error;
    }
  }

  async listarMensagens(id_conversa: string, id_usuario: string, limit: number = 30, before?: Date) {
    await this.getConversaComoParticipante(id_conversa, id_usuario);

    const take = Math.min(Math.max(limit || 30, 1), 100);
    const messages = await this.chatRepository.findMessagesByConversation(id_conversa, take + 1, before);
    const has_more = messages.length > take;
    const pagina = messages.slice(0, take).reverse(); // ordem cronológica asc

    return {
      data: pagina,
      pagination: {
        limit: take,
        has_more,
        next_before: has_more && pagina.length > 0 ? pagina[0].created_at.toISOString() : null,
      },
    };
  }

  /** Apaga para todos: só o remetente. Mantém a linha (placeholder "Mensagem apagada"). */
  async apagarMensagem(id_mensagem: string, id_usuario: string) {
    const mensagem = await this.chatRepository.findMessageById(id_mensagem);
    if (!mensagem) {
      throw new NotFoundError('Mensagem não encontrada');
    }
    if (mensagem.id_remetente !== id_usuario) {
      throw new ForbiddenError('Só pode apagar as suas próprias mensagens');
    }
    const conversa = await this.getConversaComoParticipante(mensagem.id_conversa, id_usuario);
    const atualizada = await this.chatRepository.updateMessage(id_mensagem, {
      apagada: true,
      conteudo: '',
      midia_url: null,
      reacoes: Prisma.DbNull,
    });
    this.emitParaConversa(
      mensagem.id_conversa,
      conversa.participantes.map((p) => p.id_usuario),
      CHAT_EVENTS.MESSAGE_UPDATED,
      atualizada
    );
    return atualizada;
  }

  /**
   * Reage a uma mensagem. Uma reacção por pessoa: o mesmo emoji (ou vazio)
   * remove-a, outro emoji substitui-a.
   */
  async reagirMensagem(id_mensagem: string, id_usuario: string, emoji?: string | null) {
    const mensagem = await this.chatRepository.findMessageById(id_mensagem);
    if (!mensagem) {
      throw new NotFoundError('Mensagem não encontrada');
    }
    if (mensagem.apagada) {
      throw new ValidationError('Não é possível reagir a uma mensagem apagada');
    }
    const conversa = await this.getConversaComoParticipante(mensagem.id_conversa, id_usuario);

    const reacoes: Record<string, string> =
      mensagem.reacoes && typeof mensagem.reacoes === 'object' && !Array.isArray(mensagem.reacoes)
        ? { ...(mensagem.reacoes as Record<string, string>) }
        : {};
    const valor = (emoji ?? '').trim();
    if (!valor || reacoes[id_usuario] === valor) {
      delete reacoes[id_usuario];
    } else {
      reacoes[id_usuario] = valor;
    }

    const atualizada = await this.chatRepository.updateMessage(id_mensagem, {
      reacoes: Object.keys(reacoes).length ? reacoes : Prisma.DbNull,
    });
    this.emitParaConversa(
      mensagem.id_conversa,
      conversa.participantes.map((p) => p.id_usuario),
      CHAT_EVENTS.MESSAGE_UPDATED,
      atualizada
    );
    return atualizada;
  }

  async marcarMensagemComoLida(id_mensagem: string, id_usuario: string) {
    const mensagem = await this.chatRepository.findMessageById(id_mensagem);
    if (!mensagem) {
      throw new NotFoundError('Mensagem não encontrada');
    }
    // Ler uma mensagem = ler a conversa até agora (verifica participação)
    await this.marcarTudoComoLido(mensagem.id_conversa, id_usuario);
    return { ...mensagem, lida: mensagem.id_remetente !== id_usuario ? true : mensagem.lida };
  }

  async marcarTudoComoLido(id_conversa: string, id_usuario: string) {
    const conversa = await this.getConversaComoParticipante(id_conversa, id_usuario);

    const { count, lida_em } = await this.chatRepository.markAllAsRead(id_conversa, id_usuario);

    this.emitParaConversa(
      id_conversa,
      conversa.participantes.map((p) => p.id_usuario),
      CHAT_EVENTS.READ,
      { id_conversa, id_usuario, lida_em }
    );

    return { id_conversa, count, lida_em, message: `${count} mensagem(ns) marcada(s) como lida(s)` };
  }

  async getUnreadCount(id_usuario: string) {
    return await this.chatRepository.getUnreadCount(id_usuario);
  }

  /** Sair da conversa: remove apenas o meu registo de participante; apaga a conversa se ficar vazia. */
  async deletarConversa(id_conversa: string, id_usuario: string) {
    await this.getConversaComoParticipante(id_conversa, id_usuario);
    const { conversaApagada } = await this.chatRepository.leaveConversation(id_conversa, id_usuario);
    emitToUser(id_usuario, 'chat:removed', { id_conversa });
    logger.info(`Usuário ${id_usuario} saiu da conversa ${id_conversa}${conversaApagada ? ' (conversa apagada)' : ''}`);
    return { message: 'Conversa removida com sucesso' };
  }

  async listarContatos(id_usuario: string, q?: string) {
    const termo = q?.trim() ? q.trim().slice(0, 100) : undefined;
    const { seguindo, seguidores, clientes, sugestoes } = await this.chatRepository.findContatos(id_usuario, termo, 50);

    const mapa = new Map<string, any>();
    const adicionar = (lista: any[], relacao: RelacaoContato) => {
      for (const u of lista) {
        if (!u || u.id_usuario === id_usuario || mapa.has(u.id_usuario)) continue;
        mapa.set(u.id_usuario, {
          id_usuario: u.id_usuario,
          nome: u.nome,
          foto_perfil: u.foto_perfil,
          tipo: u.tipo,
          tipo_fazedor: u.fazedor?.tipo_fazedor ?? null,
          relacao,
        });
      }
    };
    adicionar(seguindo, 'seguindo');
    adicionar(seguidores, 'seguidor');
    adicionar(clientes, 'cliente');
    adicionar(sugestoes, 'sugestao');

    return Array.from(mapa.values()).slice(0, 50);
  }
}
