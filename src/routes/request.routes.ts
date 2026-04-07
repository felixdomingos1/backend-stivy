import { Router } from 'express';
import { autenticar, verificarFazedor } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { cacheListResponse, cacheDetailResponse, invalidateOnWrite } from '../middleware/cache.middleware';
import {
  requisitarServicoValidation,
  requisitarModeloValidation,
  getRequisicaoByIdValidation,
  listRequisicoesValidation,
  aceitarRequisicaoValidation,
  recusarRequisicaoValidation,
  cancelarRequisicaoValidation,
  concluirRequisicaoValidation
} from '../validations/request.validation';
import { RequestController } from '../controller/request.controller';

const router = Router();
const requestController = new RequestController();

router.use(autenticar);

router.get('/',
  listRequisicoesValidation,
  validate,
  cacheListResponse(60),
  requestController.listarMinhasRequisicoes.bind(requestController)
);

router.get('/recebidas',
  listRequisicoesValidation,
  validate,
  cacheListResponse(60),
  requestController.listarRequisicoesRecebidas.bind(requestController)
);

router.get('/:id',
  getRequisicaoByIdValidation,
  validate,
  cacheDetailResponse(300),
  requestController.buscarRequisicaoPorId.bind(requestController)
);

router.post('/servico/:id_servico',
  requisitarServicoValidation,
  validate,
  invalidateOnWrite(['list:*/api/requests*', 'list:*/api/requests/recebidas*']),
  requestController.requisitarServico.bind(requestController)
);

router.post('/modelo/:id_modelo',
  requisitarModeloValidation,
  validate,
  invalidateOnWrite(['list:*/api/requests*', 'list:*/api/requests/recebidas*']),
  requestController.requisitarModelo.bind(requestController)
);

router.put('/:id/aceitar',
  verificarFazedor,
  aceitarRequisicaoValidation,
  validate,
  invalidateOnWrite([`detail:*/api/requests/*`, 'list:*/api/requests*', 'list:*/api/requests/recebidas*']),
  requestController.aceitarRequisicao.bind(requestController)
);

router.put('/:id/recusar',
  verificarFazedor,
  recusarRequisicaoValidation,
  validate,
  invalidateOnWrite([`detail:*/api/requests/*`, 'list:*/api/requests*', 'list:*/api/requests/recebidas*']),
  requestController.recusarRequisicao.bind(requestController)
);

router.put('/:id/concluir',
  verificarFazedor,
  concluirRequisicaoValidation,
  validate,
  invalidateOnWrite([`detail:*/api/requests/*`, 'list:*/api/requests*', 'list:*/api/requests/recebidas*']),
  requestController.concluirRequisicao.bind(requestController)
);

router.put('/:id/cancelar',
  cancelarRequisicaoValidation,
  validate,
  invalidateOnWrite([`detail:*/api/requests/*`, 'list:*/api/requests*']),
  requestController.cancelarRequisicao.bind(requestController)
);

router.get('/estatisticas/dashboard',
  cacheDetailResponse(300),
  requestController.getEstatisticas.bind(requestController)
);

export default router;
