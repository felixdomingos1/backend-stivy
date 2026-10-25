import { Router } from 'express';
import { autenticar } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { authRateLimit, otpRateLimit, refreshTokenRateLimit } from '../middleware/rateLimit.middleware';
import { AuthController } from '../controller/auth.controller';
import {
  registerValidation,
  loginValidation,
  verifyEmailValidation,
  requestPasswordResetValidation,
  verifyPasswordResetOTPValidation,
  resetPasswordWithOTPValidation,
  resendOTPValidation,
  refreshTokenValidation
} from '../validations/auth.validation';

const router = Router();
const authController = new AuthController();

router.post('/registrar', authRateLimit, registerValidation, validate, authController.registrar.bind(authController));
router.post('/login', authRateLimit, loginValidation, validate, authController.login.bind(authController));

router.post('/verificar-email', otpRateLimit, verifyEmailValidation, validate, authController.verificarEmail.bind(authController));
router.post('/reenviar-otp', otpRateLimit, resendOTPValidation, validate, authController.reenviarOTP.bind(authController));

router.post('/recuperar-senha', authRateLimit, requestPasswordResetValidation, validate, authController.recuperarSenha.bind(authController));
router.post('/verificar-codigo-recuperacao', otpRateLimit, verifyPasswordResetOTPValidation, validate, authController.verificarCodigoRecuperacao.bind(authController));
router.post('/redefinir-senha-otp', otpRateLimit, resetPasswordWithOTPValidation, validate, authController.redefinirSenhaComOTP.bind(authController));

router.get('/me', autenticar, authController.me.bind(authController));
router.post('/refresh-token', refreshTokenRateLimit, refreshTokenValidation, validate, authController.refreshToken.bind(authController));
router.post('/logout', autenticar, authController.logout.bind(authController));

export default router;
