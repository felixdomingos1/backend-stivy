import { Router } from 'express';
import multer from 'multer';
import { autenticar, verificarFazedor } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { cacheListResponse, cacheDetailResponse, invalidateOnWrite } from '../middleware/cache.middleware';
import {
  createServicoValidation,
  updateServicoValidation,
  listServicosValidation,
  listFazedoresValidation,
  getFazedorByIdValidation,
  createAvaliacaoValidation,
  listAvaliacoesValidation,
  searchValidation,
  denunciarServicoValidation
} from '../validations/fashion.validation';
import { FashionController } from '../controller/fashion.controller';
import { handleUploadError, uploadMultiple, uploadSingle } from '../middleware/upload.middleware';
import { autenticacaoOpcional } from '../services/authorization.service';

const router = Router();
const fashionController = new FashionController();

// Padrões de invalidação (formato documentado em middleware/cache.middleware.ts)
const SERVICOS_CACHE = '/api/v1/fashion/servicos*';
const FAZEDORES_CACHE = '/api/v1/fashion/fazedores*';
const MODELOS_CACHE = '/api/v1/fashion/modelos*';

// Upload de imagens dos modelos: `foto` | `foto_perfil` | `imagem` (1) e `fotos` (até 10)
const IMAGE_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const uploadModelo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), files: 10 },
  fileFilter: (_req, file, cb) => {
    if (IMAGE_MIMES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo de arquivo não suportado. Use JPEG, PNG, WEBP ou GIF.'));
  }
}).fields([
  { name: 'foto', maxCount: 1 },
  { name: 'foto_perfil', maxCount: 1 },
  { name: 'imagem', maxCount: 1 },
  { name: 'fotos', maxCount: 10 }
]);

router.get('/pesquisa',
  searchValidation,
  validate,
  fashionController.search.bind(fashionController)
);

// ---------------- Serviços (publicações) ----------------
router.get('/servicos',
  autenticacaoOpcional,
  listServicosValidation,
  validate,
  cacheListResponse(60),
  fashionController.listarServicos.bind(fashionController)
);

router.get('/servicos/:id',
  autenticacaoOpcional,
  cacheDetailResponse(120),
  fashionController.buscarServicoPorId.bind(fashionController)
);

router.post('/servicos',
  autenticar,
  uploadSingle,
  handleUploadError,
  createServicoValidation,
  validate,
  invalidateOnWrite([SERVICOS_CACHE, FAZEDORES_CACHE]),
  fashionController.criarServico.bind(fashionController)
);

router.put('/servicos/:id',
  autenticar,
  uploadSingle,
  handleUploadError,
  updateServicoValidation,
  validate,
  invalidateOnWrite([SERVICOS_CACHE, FAZEDORES_CACHE]),
  fashionController.atualizarServico.bind(fashionController)
);

router.delete('/servicos/:id',
  autenticar,
  invalidateOnWrite([SERVICOS_CACHE, FAZEDORES_CACHE]),
  fashionController.removerServico.bind(fashionController)
);

router.post('/servicos/:id/imagens',
  autenticar,
  uploadMultiple,
  handleUploadError,
  invalidateOnWrite([SERVICOS_CACHE]),
  fashionController.adicionarImagensServico.bind(fashionController)
);

router.get('/servicos/:id/imagens',
  fashionController.listarImagensServico.bind(fashionController)
);

router.delete('/servicos/imagens/:id_imagem',
  autenticar,
  invalidateOnWrite([SERVICOS_CACHE]),
  fashionController.removerImagemServico.bind(fashionController)
);

router.put('/servicos/:id/imagens/principal/:id_imagem',
  autenticar,
  invalidateOnWrite([SERVICOS_CACHE]),
  fashionController.definirImagemPrincipal.bind(fashionController)
);

// ---------------- Portfolio do fazedor ----------------
router.post('/portfolio/imagens',
  autenticar,
  uploadMultiple,
  handleUploadError,
  invalidateOnWrite([FAZEDORES_CACHE]),
  fashionController.adicionarPortfolio.bind(fashionController)
);

router.get('/portfolio',
  autenticar,
  fashionController.listarPortfolio.bind(fashionController)
);

router.put('/portfolio/reordenar',
  autenticar,
  invalidateOnWrite([FAZEDORES_CACHE]),
  fashionController.reordenarPortfolio.bind(fashionController)
);

router.delete('/portfolio/:id',
  autenticar,
  invalidateOnWrite([FAZEDORES_CACHE]),
  fashionController.removerImagemPortfolio.bind(fashionController)
);

// ---------------- Fazedores ----------------
router.get('/fazedores',
  listFazedoresValidation,
  validate,
  cacheListResponse(120),
  fashionController.listarFazedores.bind(fashionController)
);

// Antes de /fazedores/:id
router.get('/fazedores/proximos',
  cacheListResponse(60),
  fashionController.listarFazedoresProximos.bind(fashionController)
);

router.get('/fazedores/:id',
  getFazedorByIdValidation,
  validate,
  cacheDetailResponse(120),
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
  invalidateOnWrite([FAZEDORES_CACHE]),
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

// ---------------- Modelos (agência) ----------------
router.get('/modelos',
  cacheListResponse(60),
  fashionController.listarModelosPublicos.bind(fashionController)
);

// Pessoal: sem cache. Antes de /modelos/:id
router.get('/modelos/minhas',
  autenticar,
  verificarFazedor,
  fashionController.listarMeusModelos.bind(fashionController)
);

router.post('/modelos/criar-com-foto',
  autenticar,
  uploadModelo,
  handleUploadError,
  invalidateOnWrite([MODELOS_CACHE, FAZEDORES_CACHE]),
  fashionController.criarModeloComFoto.bind(fashionController)
);

router.post('/modelos',
  autenticar,
  invalidateOnWrite([MODELOS_CACHE, FAZEDORES_CACHE]),
  fashionController.criarModelo.bind(fashionController)
);

router.get('/modelos/:id',
  autenticacaoOpcional,
  fashionController.buscarModeloPorId.bind(fashionController)
);

router.put('/modelos/:id',
  autenticar,
  invalidateOnWrite([MODELOS_CACHE, FAZEDORES_CACHE]),
  fashionController.atualizarModelo.bind(fashionController)
);

router.patch('/modelos/:id/status',
  autenticar,
  invalidateOnWrite([MODELOS_CACHE, FAZEDORES_CACHE]),
  fashionController.atualizarStatusModelo.bind(fashionController)
);

router.delete('/modelos/:id',
  autenticar,
  invalidateOnWrite([MODELOS_CACHE, FAZEDORES_CACHE]),
  fashionController.removerModelo.bind(fashionController)
);

router.post('/modelos/:id/fotos',
  autenticar,
  uploadModelo,
  handleUploadError,
  invalidateOnWrite([MODELOS_CACHE]),
  fashionController.adicionarFotoModelo.bind(fashionController)
);

router.delete('/modelos/:id/fotos/:id_foto',
  autenticar,
  invalidateOnWrite([MODELOS_CACHE]),
  fashionController.removerFotoModelo.bind(fashionController)
);

// ---------------- Comentários / reações / partilhas ----------------
router.post('/servicos/:id/comentarios',
  autenticar,
  fashionController.comentarServico.bind(fashionController)
);

router.get('/servicos/:id/comentarios',
  fashionController.listarComentariosServico.bind(fashionController)
);

router.post('/comentarios/:id/reacoes',
  autenticar,
  fashionController.reagirComentario.bind(fashionController)
);

router.delete('/comentarios/:id/reacoes',
  autenticar,
  fashionController.removerReacaoComentario.bind(fashionController)
);

router.delete('/comentarios/:id',
  autenticar,
  fashionController.deletarComentario.bind(fashionController)
);

router.post('/servicos/:id/reacoes',
  autenticar,
  fashionController.reagirServico.bind(fashionController)
);

router.delete('/servicos/:id/reacoes',
  autenticar,
  fashionController.removerReacaoServico.bind(fashionController)
);

router.get('/servicos/:id/reacoes',
  autenticacaoOpcional,
  fashionController.getReacoesServico.bind(fashionController)
);

router.post('/servicos/:id/compartilhar',
  autenticar,
  fashionController.compartilharServico.bind(fashionController)
);

router.get('/servicos/:id/compartilhamentos',
  fashionController.getCompartilhamentosServico.bind(fashionController)
);

router.post('/servicos/:id/denuncias',
  autenticar,
  denunciarServicoValidation,
  validate,
  fashionController.denunciarServico.bind(fashionController)
);

export default router;
