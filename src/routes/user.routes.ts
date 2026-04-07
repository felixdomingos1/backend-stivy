import { Router } from 'express';
import { UserController } from '../controller/user.controller';
import { autenticar } from '../middleware/auth.middleware';
import { favoritoIdValidation, updateFotoValidation, updatePasswordValidation, updateProfileValidation } from '../validations/auth.validation';

const router = Router();
const userController = new UserController();


router.get('/todos', userController.pegarTodos.bind(userController));

router.use(autenticar);
router.get('/perfil', userController.getPerfil.bind(userController));
router.put('/perfil', updateProfileValidation, userController.atualizarPerfil.bind(userController));
router.put('/senha', updatePasswordValidation, userController.atualizarSenha.bind(userController));
router.put('/foto-perfil', updateFotoValidation, userController.atualizarFotoPerfil.bind(userController));

router.get('/favoritos', userController.listarFavoritos.bind(userController));
router.post('/favoritos/:id_fazedor', favoritoIdValidation, userController.adicionarFavorito.bind(userController));
router.delete('/favoritos/:id_fazedor', favoritoIdValidation, userController.removerFavorito.bind(userController));

router.get('/estatisticas', userController.getEstatisticas.bind(userController));

export default router;
