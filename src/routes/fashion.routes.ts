import { Router } from 'express';
import { autenticar } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { cacheListResponse, cacheDetailResponse, invalidateOnWrite } from '../middleware/cache.middleware';
import {
  createServicoValidation,
  updateServicoValidation,
  listServicosValidation,
  listFazedoresValidation,
  getFazedorByIdValidation,
  createAvaliacaoValidation,
  listAvaliacoesValidation
} from '../validations/fashion.validation';
import { FashionController } from '../controller/fashion.controller';
import { handleUploadError, uploadMultiple, uploadSingle } from '../middleware/upload.middleware';

const router = Router();
const fashionController = new FashionController();

router.get('/servicos',
  listServicosValidation,
  validate,
  cacheListResponse(60),
  fashionController.listarServicos.bind(fashionController)
);

router.get('/servicos/:id',
  cacheDetailResponse(300),
  fashionController.buscarServicoPorId.bind(fashionController)
);

router.post('/servicos',
  autenticar,
  uploadSingle,
  handleUploadError,
  createServicoValidation,
  validate,
  invalidateOnWrite(['list:*/api/fashion/servicos*']),
  fashionController.criarServico.bind(fashionController)
);

router.put('/servicos/:id',
  autenticar,
  uploadSingle,
  handleUploadError,
  updateServicoValidation,
  validate,
  invalidateOnWrite(['list:*/api/fashion/servicos*', 'detail:*/api/fashion/servicos/*']),
  fashionController.atualizarServico.bind(fashionController)
);

router.delete('/servicos/:id',
  autenticar,
  validate,
  invalidateOnWrite(['list:*/api/fashion/servicos*', 'detail:*/api/fashion/servicos/*']),
  fashionController.removerServico.bind(fashionController)
);

router.post('/portfolio/imagens',
  autenticar,
  uploadMultiple,
  handleUploadError,
  fashionController.adicionarPortfolio.bind(fashionController)
);

router.get('/portfolio',
  autenticar,
  fashionController.listarPortfolio.bind(fashionController)
);

router.delete('/portfolio/:id',
  autenticar,
  fashionController.removerImagemPortfolio.bind(fashionController)
);

router.put('/portfolio/reordenar',
  autenticar,
  fashionController.reordenarPortfolio.bind(fashionController)
);

router.post('/servicos/:id/imagens',
  autenticar,
  uploadMultiple,
  handleUploadError,
  fashionController.adicionarImagensServico.bind(fashionController)
);

router.get('/servicos/:id/imagens',
  fashionController.listarImagensServico.bind(fashionController)
);

router.delete('/servicos/imagens/:id_imagem',
  autenticar,
  fashionController.removerImagemServico.bind(fashionController)
);

router.put('/servicos/:id/imagens/principal/:id_imagem',
  autenticar,
  fashionController.definirImagemPrincipal.bind(fashionController)
);

router.get('/fazedores',
  listFazedoresValidation,
  validate,
  cacheListResponse(120),
  fashionController.listarFazedores.bind(fashionController)
);

router.get('/fazedores/:id',
  getFazedorByIdValidation,
  validate,
  cacheDetailResponse(300),
  fashionController.buscarFazedorPorId.bind(fashionController)
);

router.get('/fazedores/:id/servicos',
  getFazedorByIdValidation,
  validate,
  cacheListResponse(60),
  fashionController.listarServicosDoFazedor.bind(fashionController)
);

router.get('/fazedores/:id/avaliacoes',
  getFazedorByIdValidation,
  listAvaliacoesValidation,
  validate,
  cacheListResponse(120),
  fashionController.listarAvaliacoesDoFazedor.bind(fashionController)
);

router.post('/avaliacoes',
  autenticar,
  createAvaliacaoValidation,
  validate,
  invalidateOnWrite(['detail:*/api/fashion/fazedores/*', 'list:*/api/fashion/fazedores/*/avaliacoes*']),
  fashionController.avaliarFazedor.bind(fashionController)
);

router.get('/categorias/servicos',
  cacheListResponse(3600),
  fashionController.getCategoriasServicos.bind(fashionController)
);

router.get('/tipos/fazedores',
  cacheListResponse(3600),
  fashionController.getTiposFazedores.bind(fashionController)
);

export default router;
