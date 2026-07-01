import { Router } from 'express';
import { autenticar } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { ChatController } from '../controller/chat.controller';
import {
  createConversationValidation,
  sendMessageValidation,
  getConversationMessagesValidation,
  conversationIdValidation,
  messageIdValidation,
} from '../validations/chat.validation';

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

router.get(
  '/nao-lidas',
  chatController.getUnreadCount.bind(chatController)
);

router.get(
  '/:id',
  conversationIdValidation,
  validate,
  chatController.buscarConversa.bind(chatController)
);

router.post(
  '/:id/mensagens',
  sendMessageValidation,
  validate,
  chatController.enviarMensagem.bind(chatController)
);

router.get(
  '/:id/mensagens',
  getConversationMessagesValidation,
  validate,
  chatController.listarMensagens.bind(chatController)
);

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

export default router;
