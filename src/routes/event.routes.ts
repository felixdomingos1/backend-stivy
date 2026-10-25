import { Router } from 'express';
import multer from 'multer';
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
import { handleUploadError } from '../middleware/upload.middleware';
import { autenticacaoOpcional } from '../services/authorization.service';

const router = Router();
const eventController = new EventController();

// Padrões de invalidação no formato documentado em cache.middleware.ts
const EVENTS_CACHE = '/api/v1/events*';

// Upload do evento: `banner` (1) e/ou `fotos` (até 10), apenas imagens
const IMAGE_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const uploadEvento = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), files: 11 },
  fileFilter: (_req, file, cb) => {
    if (IMAGE_MIMES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo de arquivo não suportado. Use JPEG, PNG, WEBP ou GIF.'));
  }
}).fields([{ name: 'banner', maxCount: 1 }, { name: 'fotos', maxCount: 10 }]);

// ---- Rotas pessoais (sem cache) — registadas antes de /:id ----
router.get('/meus/eventos',
  autenticar,
  eventController.getMeusEventos.bind(eventController)
);

router.get('/meus/participacoes',
  autenticar,
  eventController.getEventosParticipando.bind(eventController)
);

router.get('/estatisticas/dashboard',
  autenticar,
  eventController.getEstatisticas.bind(eventController)
);

// ---- Rotas públicas (autenticação opcional; cache por utilizador) ----
router.get('/',
  autenticacaoOpcional,
  listEventosValidation,
  validate,
  cacheListResponse(60),
  eventController.listarEventos.bind(eventController)
);

router.get('/proximos',
  autenticacaoOpcional,
  cacheListResponse(60),
  eventController.listarEventosProximos.bind(eventController)
);

router.get('/:id',
  autenticacaoOpcional,
  getEventoByIdValidation,
  validate,
  cacheDetailResponse(120),
  eventController.buscarEventoPorId.bind(eventController)
);

router.get('/:id/participantes',
  autenticacaoOpcional,
  listParticipantesValidation,
  validate,
  eventController.listarParticipantes.bind(eventController)
);

// ---- Escrita ----
router.post('/',
  autenticar,
  uploadEvento,
  handleUploadError,
  createEventoValidation,
  validate,
  invalidateOnWrite([EVENTS_CACHE]),
  eventController.criarEvento.bind(eventController)
);

router.put('/:id',
  autenticar,
  updateEventoValidation,
  validate,
  invalidateOnWrite([EVENTS_CACHE]),
  eventController.atualizarEvento.bind(eventController)
);

router.delete('/:id',
  autenticar,
  getEventoByIdValidation,
  validate,
  invalidateOnWrite([EVENTS_CACHE]),
  eventController.cancelarEvento.bind(eventController)
);

router.post('/:id/participar',
  autenticar,
  participarEventoValidation,
  validate,
  invalidateOnWrite([EVENTS_CACHE]),
  eventController.confirmarParticipacao.bind(eventController)
);

router.delete('/:id/participar',
  autenticar,
  participarEventoValidation,
  validate,
  invalidateOnWrite([EVENTS_CACHE]),
  eventController.cancelarParticipacao.bind(eventController)
);

export default router;
