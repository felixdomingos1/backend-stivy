import { Router } from 'express';
import { autenticar } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { param } from 'express-validator';
import { NotificationController } from '../controller/notification.controller';

// Rotas pessoais: SEM cache (dados por utilizador mudam a cada notificação).
const router = Router();
const notificationController = new NotificationController();

router.use(autenticar);

router.get('/',
  notificationController.listarNotificacoes.bind(notificationController)
);

router.get('/nao-lidas',
  notificationController.listarNaoLidas.bind(notificationController)
);

router.get('/nao-lidas/count',
  notificationController.contarNaoLidas.bind(notificationController)
);

router.get('/ultimas',
  notificationController.getUltimasNotificacoes.bind(notificationController)
);

router.get('/estatisticas/dashboard',
  notificationController.getEstatisticas.bind(notificationController)
);

router.put('/lidas-todas',
  notificationController.marcarTodasComoLidas.bind(notificationController)
);

router.delete('/',
  notificationController.removerTodas.bind(notificationController)
);

router.get('/:id',
  param('id').isUUID().withMessage('ID inválido'),
  validate,
  notificationController.buscarNotificacaoPorId.bind(notificationController)
);

router.put('/:id/lida',
  param('id').isUUID().withMessage('ID inválido'),
  validate,
  notificationController.marcarComoLida.bind(notificationController)
);

router.delete('/:id',
  param('id').isUUID().withMessage('ID inválido'),
  validate,
  notificationController.removerNotificacao.bind(notificationController)
);

export default router;
