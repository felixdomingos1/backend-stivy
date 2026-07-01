import { Router } from 'express';
import { UserController } from '../controller/user.controller';
import { autenticar } from '../middleware/auth.middleware';
import { favoritoIdValidation, updatePasswordValidation, updateProfileValidation } from '../validations/auth.validation';
import { handleUploadError, uploadFotoPerfil } from '../middleware/upload.middleware';

const router = Router();
const userController = new UserController();


router.get('/todos', userController.pegarTodos.bind(userController));

router.use(autenticar);
router.get('/perfil', userController.getPerfil.bind(userController));
router.put('/perfil', updateProfileValidation, userController.atualizarPerfil.bind(userController));
router.put('/senha', updatePasswordValidation, userController.atualizarSenha.bind(userController));

router.put('/foto-perfil',
  uploadFotoPerfil,
  handleUploadError,
  userController.atualizarFotoPerfil.bind(userController)
);

router.get('/favoritos', userController.listarFavoritos.bind(userController));
router.post('/favoritos/:id_fazedor', favoritoIdValidation, userController.adicionarFavorito.bind(userController));
router.delete('/favoritos/:id_fazedor', favoritoIdValidation, userController.removerFavorito.bind(userController));

router.get('/estatisticas', userController.getEstatisticas.bind(userController));

router.get('/meus-servicos', userController.getMeusServicos.bind(userController));

router.post('/seguir/:id', userController.seguirUsuario.bind(userController));
router.delete('/seguir/:id', userController.deixarSeguirUsuario.bind(userController));
router.get('/seguidores', userController.getMeusSeguidores.bind(userController));
router.get('/seguindo', userController.getQuemSigo.bind(userController));

router.get('/:id/seguidores', userController.getUserSeguidores.bind(userController));

router.post('/logout', userController.logout.bind(userController));
export default router;
