import { Router } from 'express';
import { autenticar, verificarFazedor } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
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

// Rotas pessoais: sem cache.
router.use(autenticar);

router.get('/',
  listRequisicoesValidation,
  validate,
  requestController.listarMinhasRequisicoes.bind(requestController)
);

router.get('/recebidas',
  listRequisicoesValidation,
  validate,
  requestController.listarRequisicoesRecebidas.bind(requestController)
);

router.get('/estatisticas/dashboard',
  requestController.getEstatisticas.bind(requestController)
);

router.get('/:id',
  getRequisicaoByIdValidation,
  validate,
  requestController.buscarRequisicaoPorId.bind(requestController)
);

router.post('/servico/:id_servico',
  requisitarServicoValidation,
  validate,
  requestController.requisitarServico.bind(requestController)
);

router.post('/modelo/:id_modelo',
  requisitarModeloValidation,
  validate,
  requestController.requisitarModelo.bind(requestController)
);

router.put('/:id/aceitar',
  verificarFazedor,
  aceitarRequisicaoValidation,
  validate,
  requestController.aceitarRequisicao.bind(requestController)
);

router.put('/:id/recusar',
  verificarFazedor,
  recusarRequisicaoValidation,
  validate,
  requestController.recusarRequisicao.bind(requestController)
);

router.put('/:id/concluir',
  verificarFazedor,
  concluirRequisicaoValidation,
  validate,
  requestController.concluirRequisicao.bind(requestController)
);

router.put('/:id/cancelar',
  cancelarRequisicaoValidation,
  validate,
  requestController.cancelarRequisicao.bind(requestController)
);


export default router;
