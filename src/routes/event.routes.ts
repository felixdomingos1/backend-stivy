import { Router } from 'express';
import { autenticar } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { cacheListResponse, cacheDetailResponse, invalidateOnWrite } from '../middleware/cache.middleware';
import {
  createEventoValidation,
  updateEventoValidation,
  listEventosValidation,
  getEventoByIdValidation,
  participarEventoValidation,
  listParticipantesValidation
} from '../validations/event.validation';
import { EventController } from '../controller/event.controller';

const router = Router();
const eventController = new EventController();

router.get('/',
  listEventosValidation,
  validate,
  cacheListResponse(60),
  eventController.listarEventos.bind(eventController)
);

router.get('/proximos',
  cacheListResponse(60),
  eventController.listarEventosProximos.bind(eventController)
);

router.get('/:id',
  getEventoByIdValidation,
  validate,
  cacheDetailResponse(300),
  eventController.buscarEventoPorId.bind(eventController)
);

router.post('/',
  autenticar,
  createEventoValidation,
  validate,
  invalidateOnWrite(['list:*/api/events*']),
  eventController.criarEvento.bind(eventController)
);

router.put('/:id',
  autenticar,
  updateEventoValidation,
  validate,
  invalidateOnWrite(['list:*/api/events*', 'detail:*/api/events/*']),
  eventController.atualizarEvento.bind(eventController)
);

router.delete('/:id',
  autenticar,
  getEventoByIdValidation,
  validate,
  invalidateOnWrite(['list:*/api/events*', 'detail:*/api/events/*']),
  eventController.cancelarEvento.bind(eventController)
);

router.post('/:id/participar',
  autenticar,
  participarEventoValidation,
  validate,
  invalidateOnWrite([`detail:*/api/events/*`, `list:*/api/events/*/participantes*`]),
  eventController.confirmarParticipacao.bind(eventController)
);

router.delete('/:id/participar',
  autenticar,
  participarEventoValidation,
  validate,
  invalidateOnWrite([`detail:*/api/events/*`, `list:*/api/events/*/participantes*`]),
  eventController.cancelarParticipacao.bind(eventController)
);

router.get('/:id/participantes',
  listParticipantesValidation,
  validate,
  cacheListResponse(60),
  eventController.listarParticipantes.bind(eventController)
);

router.get('/meus/eventos',
  autenticar,
  cacheListResponse(60),
  eventController.getMeusEventos.bind(eventController)
);

router.get('/meus/participacoes',
  autenticar,
  cacheListResponse(60),
  eventController.getEventosParticipando.bind(eventController)
);

router.get('/estatisticas/dashboard',
  autenticar,
  cacheDetailResponse(300),
  eventController.getEstatisticas.bind(eventController)
);

export default router;
