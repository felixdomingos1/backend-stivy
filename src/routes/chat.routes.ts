import { Router } from 'express';
import { autenticar } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { uploadSingle, handleUploadError } from '../middleware/upload.middleware';
import { ChatController } from '../controller/chat.controller';
import {
  createConversationValidation,
  sendMessageValidation,
  getConversationMessagesValidation,
  conversationIdValidation,
  messageIdValidation,
} from '../validations/chat.validation';

// Rotas pessoais: sem cache.
const router = Router();
const chatController = new ChatController();

router.use(autenticar);

router.get('/', chatController.listarConversas.bind(chatController));

router.post(
  '/',
  createConversationValidation,
  validate,
  chatController.criarConversa.bind(chatController)
);

router.get('/nao-lidas', chatController.getUnreadCount.bind(chatController));

router.get('/contatos', chatController.listarContatos.bind(chatController));

// Rotas legadas (mantidas por compatibilidade)
router.put(
  '/mensagens/:id/lida',
  messageIdValidation,
  validate,
  chatController.marcarMensagemComoLida.bind(chatController)
);

router.put(
  '/conversas/:id/lida',
  conversationIdValidation,
  validate,
  chatController.marcarTudoComoLido.bind(chatController)
);

router.delete(
  '/conversas/:id',
  conversationIdValidation,
  validate,
  chatController.deletarConversa.bind(chatController)
);

router.get(
  '/conversas/:id/mensagens',
  getConversationMessagesValidation,
  validate,
  chatController.listarMensagens.bind(chatController)
);

router.post(
  '/conversas/:id/mensagens',
  uploadSingle,
  handleUploadError,
  sendMessageValidation,
  validate,
  chatController.enviarMensagem.bind(chatController)
);

router.get(
  '/:id',
  conversationIdValidation,
  validate,
  chatController.buscarConversa.bind(chatController)
);

router.get(
  '/:id/mensagens',
  getConversationMessagesValidation,
  validate,
  chatController.listarMensagens.bind(chatController)
);

// JSON { conteudo, tipo:'texto' } ou multipart com `imagem` (+ conteudo opcional)
router.post(
  '/:id/mensagens',
  uploadSingle,
  handleUploadError,
  sendMessageValidation,
  validate,
  chatController.enviarMensagem.bind(chatController)
);

router.put(
  '/:id/lida',
  conversationIdValidation,
  validate,
  chatController.marcarTudoComoLido.bind(chatController)
);

router.delete(
  '/:id',
  conversationIdValidation,
  validate,
  chatController.deletarConversa.bind(chatController)
);

export default router;
