import { Router } from 'express';
import { body, query, param } from 'express-validator';

// import { UserController } from '../controllers/user.controller';
// import { FashionController } from '../controllers/fashion.controller';
// import { EventController } from '../controllers/event.controller';
// import { RequestController } from '../controllers/request.controller';
// import { NotificationController } from '../controllers/notification.controller';

// Middleware
import { autenticar, verificarFazedor } from '../middleware/auth.middleware';
import { AuthController } from '../controller/auth.controller';

// Instanciar controllers
const authController = new AuthController();
// const userController = new UserController();
// const fashionController = new FashionController();
// const eventController = new EventController();
// const requestController = new RequestController();
// const notificationController = new NotificationController();

const router = Router();

// ============================================
// ROTAS DE AUTENTICAÇÃO
// ============================================
router.post('/auth/registrar', [
  body('nome').notEmpty().withMessage('Nome é obrigatório'),
  body('email').isEmail().withMessage('Email inválido'),
  body('senha').isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres'),
  body('tipo').isIn(['fazedor', 'apreciador']).withMessage('Tipo inválido')
], authController.registrar);

router.post('/auth/login', [
  body('email').isEmail().withMessage('Email inválido'),
  body('senha').notEmpty().withMessage('Senha é obrigatória')
], authController.login);

router.get('/auth/me', autenticar, authController.me);

router.post('/auth/recuperar-senha', [
  body('email').isEmail().withMessage('Email inválido')
], authController.recuperarSenha);

router.post('/auth/redefinir-senha', [
  body('token').notEmpty().withMessage('Token é obrigatório'),
  body('nova_senha').isLength({ min: 6 }).withMessage('Nova senha deve ter no mínimo 6 caracteres')
], authController.redefinirSenha);

// ============================================
// ROTAS DE USUÁRIO
// ============================================
// router.get('/users/perfil', autenticar, userController.getPerfil);
// router.put('/users/perfil', autenticar, userController.atualizarPerfil);
// router.put('/users/foto-perfil', autenticar, userController.atualizarFotoPerfil);
// router.get('/users/favoritos', autenticar, userController.listarFavoritos);
// router.post('/users/favoritos/:id_fazedor', autenticar, userController.adicionarFavorito);
// router.delete('/users/favoritos/:id_fazedor', autenticar, userController.removerFavorito);

// ============================================
// ROTAS DE MODA (SERVIÇOS, MODELOS, FAZEDORES)
// ============================================

// --- Serviços ---
// router.get('/fashion/servicos', [
//   query('categoria').optional().isString(),
//   query('page').optional().isInt({ min: 1 }),
//   query('limit').optional().isInt({ min: 1, max: 100 })
// ], fashionController.listarServicos);

// router.get('/fashion/servicos/:id', fashionController.buscarServicoPorId);

// router.post('/fashion/servicos', autenticar, verificarFazedor, [
//   body('titulo').notEmpty().withMessage('Título é obrigatório'),
//   body('descricao').optional().isString(),
//   body('categoria').optional().isString(),
//   body('valor').optional().isFloat({ min: 0 }),
//   body('tempo_estimado').optional().isString()
// ], fashionController.criarServico);

// router.put('/fashion/servicos/:id', autenticar, verificarFazedor, fashionController.atualizarServico);
// router.delete('/fashion/servicos/:id', autenticar, verificarFazedor, fashionController.removerServico);

// --- Modelos (Agências) ---
// router.get('/fashion/modelos', [
//   query('genero').optional().isIn(['feminino', 'masculino', 'outro']),
//   query('status').optional().isString(),
//   query('page').optional().isInt({ min: 1 })
// ], fashionController.listarModelos);

// router.get('/fashion/modelos/:id', fashionController.buscarModeloPorId);

// router.post('/fashion/modelos', autenticar, verificarFazedor, [
//   body('nome_completo').notEmpty().withMessage('Nome completo é obrigatório'),
//   body('genero').optional().isIn(['feminino', 'masculino', 'outro']),
//   body('altura').optional().isFloat({ min: 0.5, max: 2.5 }),
//   body('busto').optional().isInt({ min: 50, max: 150 }),
//   body('cintura').optional().isInt({ min: 40, max: 120 }),
//   body('quadril').optional().isInt({ min: 50, max: 150 })
// ], fashionController.criarModelo);

// router.put('/fashion/modelos/:id', autenticar, verificarFazedor, fashionController.atualizarModelo);
// router.delete('/fashion/modelos/:id', autenticar, verificarFazedor, fashionController.removerModelo);

// --- Fazedores (Profissionais) ---
// router.get('/fashion/fazedores', [
//   query('tipo').optional().isIn(['agencia', 'estilista', 'maquiador', 'fotografo', 'modelo_freelancer']),
//   query('avaliacao_minima').optional().isFloat({ min: 0, max: 5 })
// ], fashionController.listarFazedores);

// router.get('/fashion/fazedores/:id', fashionController.buscarFazedorPorId);
// router.get('/fashion/fazedores/:id/servicos', fashionController.listarServicosDoFazedor);
// router.get('/fashion/fazedores/:id/avaliacoes', fashionController.listarAvaliacoesDoFazedor);

// --- Avaliações ---
// router.post('/fashion/avaliacoes/:id_fazedor', autenticar, [
//   body('nota').isInt({ min: 1, max: 5 }).withMessage('Nota deve ser entre 1 e 5'),
//   body('comentario').optional().isString()
// ], fashionController.avaliarFazedor);

// ============================================
// ROTAS DE EVENTOS
// ============================================
// router.get('/events', [
//   query('tipo').optional().isString(),
//   query('data_inicio').optional().isISO8601(),
//   query('data_fim').optional().isISO8601(),
//   query('status').optional().isIn(['ativo', 'cancelado', 'concluido']),
//   query('page').optional().isInt({ min: 1 })
// ], eventController.listarEventos);

// router.get('/events/proximos', eventController.listarEventosProximos);
// router.get('/events/:id', eventController.buscarEventoPorId);

// router.post('/events', autenticar, verificarFazedor, [
//   body('titulo').notEmpty().withMessage('Título é obrigatório'),
//   body('data_inicio').isISO8601().withMessage('Data de início inválida'),
//   body('data_fim').isISO8601().withMessage('Data de fim inválida'),
//   body('tipo_evento').isIn(['desfile', 'workshop', 'casting', 'fashion_week', 'concurso', 'outro']),
//   body('local').optional().isString(),
//   body('vagas_disponiveis').optional().isInt({ min: 0 }),
//   body('valor_ingresso').optional().isFloat({ min: 0 })
// ], eventController.criarEvento);

// router.put('/events/:id', autenticar, verificarFazedor, eventController.atualizarEvento);
// router.delete('/events/:id', autenticar, verificarFazedor, eventController.cancelarEvento);

// Participação em eventos
// router.post('/events/:id/participar', autenticar, eventController.confirmarParticipacao);
// router.delete('/events/:id/participar', autenticar, eventController.cancelarParticipacao);
// router.get('/events/:id/participantes', eventController.listarParticipantes);

// ============================================
// ROTAS DE REQUISIÇÕES
// ============================================
// router.get('/requests', autenticar, requestController.listarMinhasRequisicoes);
// router.get('/requests/recebidas', autenticar, verificarFazedor, requestController.listarRequisicoesRecebidas);
// router.get('/requests/:id', autenticar, requestController.buscarRequisicaoPorId);

// router.post('/requests/servico/:id_servico', autenticar, [
//   body('mensagem').optional().isString(),
//   body('contato_retorno').optional().isString()
// ], requestController.requisitarServico);

// router.post('/requests/modelo/:id_modelo', autenticar, [
//   body('mensagem').optional().isString(),
//   body('contato_retorno').optional().isString()
// ], requestController.requisitarModelo);

// router.put('/requests/:id/aceitar', autenticar, verificarFazedor, requestController.aceitarRequisicao);
// router.put('/requests/:id/recusar', autenticar, verificarFazedor, requestController.recusarRequisicao);
// router.put('/requests/:id/cancelar', autenticar, requestController.cancelarRequisicao);
// router.put('/requests/:id/concluir', autenticar, requestController.concluirRequisicao);

// ============================================
// ROTAS DE NOTIFICAÇÕES
// ============================================
// router.get('/notifications', autenticar, notificationController.listarNotificacoes);
// router.get('/notifications/nao-lidas', autenticar, notificationController.listarNaoLidas);
// router.put('/notifications/:id/lida', autenticar, notificationController.marcarComoLida);
// router.put('/notifications/lidas-todas', autenticar, notificationController.marcarTodasComoLidas);
// router.delete('/notifications/:id', autenticar, notificationController.removerNotificacao);

// ============================================
// ROTAS DE ESTATÍSTICAS (apenas para fazedores)
// ============================================
// router.get('/stats/dashboard', autenticar, verificarFazedor, fashionController.getEstatisticas);
// router.get('/stats/meus-servicos', autenticar, verificarFazedor, fashionController.getEstatisticasServicos);
// router.get('/stats/minhas-requisicoes', autenticar, verificarFazedor, requestController.getEstatisticasRequisicoes);

export default router;
