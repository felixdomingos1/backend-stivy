import { Router } from 'express';
import { autenticar } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { AuthController } from '../controller/auth.controller';
import {
  registerValidation,
  loginValidation,
  verifyEmailValidation,
  resendOTPValidation,
  requestPasswordResetValidation,
  verifyPasswordResetOTPValidation,
  resetPasswordWithOTPValidation
} from '../validations/auth.validation';

const router = Router();
const authController = new AuthController();

router.post('/registrar', registerValidation, validate, authController.registrar.bind(authController));
router.post('/login', loginValidation, validate, authController.login.bind(authController));

router.post('/verificar-email', verifyEmailValidation, validate, authController.verificarEmail.bind(authController));
router.post('/reenviar-otp', resendOTPValidation, validate, authController.reenviarOTP.bind(authController));

router.post('/recuperar-senha', requestPasswordResetValidation, validate, authController.recuperarSenha.bind(authController));
router.post('/verificar-codigo-recuperacao', verifyPasswordResetOTPValidation, validate, authController.verificarCodigoRecuperacao.bind(authController));
router.post('/redefinir-senha-otp', resetPasswordWithOTPValidation, validate, authController.redefinirSenhaComOTP.bind(authController));

router.get('/me', autenticar, authController.me.bind(authController));
router.post('/logout', autenticar, authController.logout.bind(authController));

export default router;
