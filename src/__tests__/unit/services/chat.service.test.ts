import { ChatService } from '../../../services/chat.service';
import { ChatRepository, CreateConversaData } from '../../../repositories/chat.repository';
import { NotificacaoRepository } from '../../../repositories/notificacao.repository';
import { ValidationError, NotFoundError } from '../../../utils/errors';

jest.mock('../../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('ChatService', () => {
  let chatService: ChatService;
  let chatRepository: jest.Mocked<ChatRepository>;
  let notificacaoRepository: jest.Mocked<NotificacaoRepository>;

  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const userId2 = '660e8400-e29b-41d4-a716-446655440001';
  const conversationId = '770e8400-e29b-41d4-a716-446655440002';
  const messageId = '880e8400-e29b-41d4-a716-446655440003';

  const baseConversation = {
    id_conversa: conversationId,
    tipo: 'direct' as const,
    titulo: null,
    criada_em: new Date('2026-01-01'),
    atualizada_em: new Date('2026-01-01'),
    participantes: [
      {
        id_participante: 'p1',
        id_conversa: conversationId,
        id_usuario: userId,
        ultima_leitura: null,
        joined_em: new Date('2026-01-01'),
        usuario: { id_usuario: userId, nome: 'User One', foto_perfil: null },
      },
      {
        id_participante: 'p2',
        id_conversa: conversationId,
        id_usuario: userId2,
        ultima_leitura: null,
        joined_em: new Date('2026-01-01'),
        usuario: { id_usuario: userId2, nome: 'User Two', foto_perfil: null },
      },
    ],
  };

  const mockConversation = {
    ...baseConversation,
    mensagens: [],
  };

  const mockMessage = {
    id_mensagem: messageId,
    id_conversa: conversationId,
    id_remetente: userId,
    conteudo: 'Hello!',
    tipo: 'texto',
    lida: false,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    remetente: { id_usuario: userId, nome: 'User One', foto_perfil: null },
  };

  beforeEach(() => {
    chatRepository = {
      findConversationsByUser: jest.fn(),
      findConversationById: jest.fn(),
      findExistingDirectConversation: jest.fn(),
      createConversation: jest.fn(),
      findMessagesByConversation: jest.fn(),
      createMessage: jest.fn(),
      markMessageAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      getUnreadCount: jest.fn(),
      deleteConversation: jest.fn(),
      findParticipantByConversation: jest.fn(),
    } as any;

    notificacaoRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUser: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      countUnread: jest.fn(),
      delete: jest.fn(),
    } as any;

    chatService = new ChatService(chatRepository, notificacaoRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('criarConversa', () => {
    const createData: CreateConversaData = {
      tipo: 'direct',
      participantes: [userId2],
    };

    it('should create a direct conversation', async () => {
      chatRepository.findExistingDirectConversation.mockResolvedValue(null);
      chatRepository.createConversation.mockResolvedValue(mockConversation as any);

      const result = await chatService.criarConversa(createData, userId);

      expect(result as any).toMatchObject({ id_conversa: conversationId });
      expect(chatRepository.createConversation).toHaveBeenCalled();
    });

    it('should return existing direct conversation if one exists', async () => {
      chatRepository.findExistingDirectConversation.mockResolvedValue(mockConversation as any);

      const result = await chatService.criarConversa(createData, userId);

      expect(result as any).toMatchObject({ id_conversa: conversationId });
      expect(chatRepository.createConversation).not.toHaveBeenCalled();
    });

    it('should throw ValidationError if fewer than 2 participants', async () => {
      const singleParticipant: CreateConversaData = {
        tipo: 'direct',
        participantes: [],
      };

      await expect(chatService.criarConversa(singleParticipant, userId)).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw ValidationError if direct conversation has more than 2 participants', async () => {
      const tooMany: CreateConversaData = {
        tipo: 'direct',
        participantes: [userId2, 'third-user-id'],
      };

      await expect(chatService.criarConversa(tooMany, userId)).rejects.toThrow(ValidationError);
      await expect(chatService.criarConversa(tooMany, userId)).rejects.toThrow(
        'Conversa direct deve ter exatamente 2 participantes'
      );
    });

    it('should throw ValidationError if group conversation has no title', async () => {
      const groupNoTitle: CreateConversaData = {
        tipo: 'grupo',
        participantes: [userId2, 'third-user-id'],
      };

      await expect(chatService.criarConversa(groupNoTitle, userId)).rejects.toThrow(ValidationError);
      await expect(chatService.criarConversa(groupNoTitle, userId)).rejects.toThrow(
        'Conversa em grupo deve ter um título'
      );
    });

    it('should create a group conversation with title', async () => {
      const groupData: CreateConversaData = {
        tipo: 'grupo',
        titulo: 'Group Chat',
        participantes: [userId2, 'third-user-id'],
      };
      chatRepository.createConversation.mockResolvedValue({
        ...baseConversation,
        tipo: 'grupo' as const,
        titulo: 'Group Chat',
        mensagens: [],
      } as any);

      const result = await chatService.criarConversa(groupData, userId);

      expect((result as any).tipo).toBe('grupo');
      expect((result as any).titulo).toBe('Group Chat');
    });
  });

  describe('enviarMensagem', () => {
    it('should send a message successfully', async () => {
      chatRepository.findConversationById.mockResolvedValue(mockConversation as any);
      chatRepository.createMessage.mockResolvedValue(mockMessage as any);
      notificacaoRepository.create.mockResolvedValue({} as any);

      const result = await chatService.enviarMensagem(conversationId, userId, 'Hello!');

      expect(result as any).toMatchObject({ id_mensagem: messageId });
      expect(chatRepository.createMessage).toHaveBeenCalledWith({
        id_conversa: conversationId,
        id_remetente: userId,
        conteudo: 'Hello!',
        tipo: 'texto',
      });
      expect(notificacaoRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundError if conversation does not exist', async () => {
      chatRepository.findConversationById.mockResolvedValue(null);

      await expect(
        chatService.enviarMensagem(conversationId, userId, 'Hello!')
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError if user is not a participant', async () => {
      const nonParticipantId = '999e8400-e29b-41d4-a716-446655440999';
      chatRepository.findConversationById.mockResolvedValue(mockConversation as any);

      await expect(
        chatService.enviarMensagem(conversationId, nonParticipantId, 'Hello!')
      ).rejects.toThrow(ValidationError);
      await expect(
        chatService.enviarMensagem(conversationId, nonParticipantId, 'Hello!')
      ).rejects.toThrow('Acesso negado');
    });

    it('should emit socket events when io is provided', async () => {
      const mockIo = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      } as any;

      chatRepository.findConversationById.mockResolvedValue(mockConversation as any);
      chatRepository.createMessage.mockResolvedValue(mockMessage as any);
      notificacaoRepository.create.mockResolvedValue({} as any);

      await chatService.enviarMensagem(conversationId, userId, 'Hello!', 'texto', mockIo);

      expect(mockIo.to).toHaveBeenCalledWith(`chat:${conversationId}`);
      expect(mockIo.to).toHaveBeenCalledWith(`user:${userId2}`);
    });
  });

  describe('listarConversas', () => {
    it('should list conversations for a user', async () => {
      const mockConversations = [
        { ...mockConversation, mensagens: [mockMessage] },
      ];
      chatRepository.findConversationsByUser.mockResolvedValue(mockConversations as any);

      const result = await chatService.listarConversas(userId);

      expect(result).toHaveLength(1);
      expect(result[0].id_conversa).toBe(conversationId);
      expect(result[0].ultima_mensagem).toEqual(mockMessage);
      expect(chatRepository.findConversationsByUser).toHaveBeenCalledWith(userId);
    });

    it('should return empty array if user has no conversations', async () => {
      chatRepository.findConversationsByUser.mockResolvedValue([]);

      const result = await chatService.listarConversas(userId);

      expect(result).toEqual([]);
    });

    it('should handle null ultima_mensagem', async () => {
      const conversationsWithNoMessages = [
        { ...mockConversation, mensagens: [] },
      ];
      chatRepository.findConversationsByUser.mockResolvedValue(conversationsWithNoMessages as any);

      const result = await chatService.listarConversas(userId);

      expect(result[0].ultima_mensagem).toBeNull();
    });

    it('should rethrow repository errors', async () => {
      chatRepository.findConversationsByUser.mockRejectedValue(new Error('DB error'));

      await expect(chatService.listarConversas(userId)).rejects.toThrow('DB error');
    });
  });

  describe('listarMensagens', () => {
    it('should list messages with pagination', async () => {
      chatRepository.findConversationById.mockResolvedValue(mockConversation as any);
      chatRepository.findMessagesByConversation.mockResolvedValue({
        messages: [mockMessage],
        total: 1,
      });

      const result = await chatService.listarMensagens(conversationId, userId, 1, 50);

      expect(result.data).toHaveLength(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should throw NotFoundError if conversation does not exist', async () => {
      chatRepository.findConversationById.mockResolvedValue(null);

      await expect(chatService.listarMensagens(conversationId, userId)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw ValidationError if user is not a participant', async () => {
      const nonParticipantId = '999e8400-e29b-41d4-a716-446655440999';
      chatRepository.findConversationById.mockResolvedValue(mockConversation as any);

      await expect(
        chatService.listarMensagens(conversationId, nonParticipantId)
      ).rejects.toThrow(ValidationError);
    });

    it('should return reversed messages (newest first for display)', async () => {
      const oldMsg = { ...mockMessage, id_mensagem: 'old-msg', created_at: new Date('2025-12-31') };
      const newMsg = { ...mockMessage, id_mensagem: 'new-msg', created_at: new Date('2026-01-02') };

      chatRepository.findConversationById.mockResolvedValue(mockConversation as any);
      chatRepository.findMessagesByConversation.mockResolvedValue({
        messages: [oldMsg, newMsg],
        total: 2,
      });

      const result = await chatService.listarMensagens(conversationId, userId);

      expect(result.data[0].id_mensagem).toBe('new-msg');
    });
  });
});
