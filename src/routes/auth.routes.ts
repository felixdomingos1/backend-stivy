import { Router } from 'express';
import { autenticar } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { AuthController } from '../controller/auth.controller';
import {
  registerValidation,
  loginValidation,
  passwordResetRequestValidation,
  passwordResetValidation
} from '../validations/auth.validation';

const router = Router();
const authController = new AuthController();

router.post('/registrar', registerValidation, validate, authController.registrar.bind(authController));
router.post('/login', loginValidation, validate, authController.login.bind(authController));
router.get('/me', autenticar, authController.me.bind(authController));
router.post('/recuperar-senha', passwordResetRequestValidation, validate, authController.recuperarSenha.bind(authController));
router.post('/redefinir-senha', passwordResetValidation, validate, authController.redefinirSenha.bind(authController));

export default router;
