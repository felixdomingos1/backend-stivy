import { Router } from 'express';
import { autenticar } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { cacheListResponse, cacheDetailResponse, invalidateOnWrite } from '../middleware/cache.middleware';
import { param } from 'express-validator';
import { NotificationController } from '../controller/notification.controller';

const router = Router();
const notificationController = new NotificationController();

router.use(autenticar);

router.get('/',
  cacheListResponse(30),
  notificationController.listarNotificacoes.bind(notificationController)
);

router.get('/nao-lidas',
  cacheListResponse(30),
  notificationController.listarNaoLidas.bind(notificationController)
);

router.get('/ultimas',
  cacheListResponse(30),
  notificationController.getUltimasNotificacoes.bind(notificationController)
);

router.get('/:id',
  param('id').isUUID().withMessage('ID inválido'),
  validate,
  cacheDetailResponse(60),
  notificationController.buscarNotificacaoPorId.bind(notificationController)
);

router.put('/:id/lida',
  param('id').isUUID().withMessage('ID inválido'),
  validate,
  invalidateOnWrite(['list:*/api/notifications*']),
  notificationController.marcarComoLida.bind(notificationController)
);

router.put('/lidas-todas',
  invalidateOnWrite(['list:*/api/notifications*']),
  notificationController.marcarTodasComoLidas.bind(notificationController)
);

router.delete('/:id',
  param('id').isUUID().withMessage('ID inválido'),
  validate,
  invalidateOnWrite(['list:*/api/notifications*']),
  notificationController.removerNotificacao.bind(notificationController)
);

router.get('/estatisticas/dashboard',
  cacheDetailResponse(300),
  notificationController.getEstatisticas.bind(notificationController)
);

export default router;
