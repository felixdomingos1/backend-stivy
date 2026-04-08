import { Router } from 'express';
import { autenticar, verificarAdmin } from '../middleware/auth.middleware';
import { AdminController } from '../controller/admin.controller';

const router = Router();

router.use(autenticar);
router.use(verificarAdmin);

router.get('/fazedores/pendentes', AdminController.listarFazedoresPendentes);
router.put('/fazedores/:id/aprovar', AdminController.aprovarFazedor);
router.put('/fazedores/:id/rejeitar', AdminController.rejeitarFazedor);
router.get('/fazedores/:id', AdminController.detalhesFazedor);

router.get('/estatisticas', AdminController.getEstatisticasSistema);

router.get('/usuarios', AdminController.listarUsuarios);
router.delete('/usuarios/:id/deletar', AdminController.deletarUsuario);
router.put('/usuarios/:id/bloquear', AdminController.bloquearUsuario);
router.put('/usuarios/:id/desbloquear', AdminController.desbloquearUsuario);

export default router;
