import { body, param } from 'express-validator';
import { FAZEDOR_TIPOS } from '../utils/fazedor-tipos';

export const registerValidation = [
  body('nome')
    .notEmpty()
    .withMessage('Nome é obrigatório')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Nome deve ter entre 3 e 100 caracteres'),

  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail()
    .toLowerCase(),

  body('senha')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter no mínimo 6 caracteres')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('Senha deve conter pelo menos uma letra e um número'),

  body('telefone')
    .optional()
    .matches(/^[0-9]{9,11}$/)
    .withMessage('Telefone inválido'),

  body('tipo')
    .isIn(['fazedor', 'apreciador'])
    .withMessage('Tipo inválido'),

  body('tipo_fazedor')
    .optional()
    .isIn(FAZEDOR_TIPOS)
    .withMessage('Tipo de fazedor inválido')
    .custom((value, { req }) => {
      if (req.body.tipo === 'fazedor' && !value) {
        throw new Error('Tipo de fazedor é obrigatório para usuários do tipo fazedor');
      }
      return true;
    })
];

export const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail()
    .toLowerCase(),

  body('senha')
    .notEmpty()
    .withMessage('Senha é obrigatória')
];

export const passwordResetRequestValidation = [
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail()
    .toLowerCase()
];

export const passwordResetValidation = [
  body('token')
    .notEmpty()
    .withMessage('Token é obrigatório'),

  body('nova_senha')
    .isLength({ min: 6 })
    .withMessage('Nova senha deve ter no mínimo 6 caracteres')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('Nova senha deve conter pelo menos uma letra e um número')
];

export const updateProfileValidation = [
  body('nome').optional({ values: 'falsy' }).isLength({ min: 3 }).withMessage('Nome deve ter no mínimo 3 caracteres'),
  body('telefone').optional({ values: 'falsy' }).matches(/^[0-9]{9,11}$/).withMessage('Telefone inválido'),
  body('bio').optional({ values: 'falsy' }).isLength({ max: 500 }).withMessage('Bio deve ter no máximo 500 caracteres'),
  body('nome_artistico').optional({ values: 'falsy' }).isLength({ max: 100 }).withMessage('Nome artístico inválido'),
  body('altura').optional({ values: 'falsy' }).matches(/^\d+([.,]\d+)?$/).withMessage('Altura inválida'),
  body('peso').optional({ values: 'falsy' }).matches(/^\d+([.,]\d+)?$/).withMessage('Peso inválido'),
  body('busto').optional({ values: 'falsy' }).matches(/^\d+([.,]\d+)?$/).withMessage('Busto inválido'),
  body('cintura').optional({ values: 'falsy' }).matches(/^\d+([.,]\d+)?$/).withMessage('Cintura inválida'),
  body('quadril').optional({ values: 'falsy' }).matches(/^\d+([.,]\d+)?$/).withMessage('Quadril inválido'),
  body('sapato').optional({ values: 'falsy' }).isInt({ min: 0 }).withMessage('Sapato inválido'),
  body('roupa').optional({ values: 'falsy' }).matches(/^\d+([.,]\d+)?$/).withMessage('Roupa inválida'),
  body('cabelo').optional({ values: 'falsy' }).isLength({ max: 50 }).withMessage('Cor de cabelo inválida'),
  body('olhos').optional({ values: 'falsy' }).isLength({ max: 50 }).withMessage('Cor dos olhos inválida'),
  body('idade').optional({ values: 'falsy' }).isInt({ min: 0, max: 120 }).withMessage('Idade inválida'),
  body('nacionalidade').optional({ values: 'falsy' }).isLength({ max: 50 }).withMessage('Nacionalidade inválida'),
  body('experiencia').optional({ values: 'falsy' }).isLength({ max: 1000 }).withMessage('Experiência deve ter no máximo 1000 caracteres'),
  body('habilidades').optional({ values: 'falsy' }).isLength({ max: 1000 }).withMessage('Habilidades devem ter no máximo 1000 caracteres'),
  body('status_modelo').optional({ values: 'falsy' }).isIn(['disponivel', 'indisponivel']).withMessage('Status inválido'),
  // Campos do Fazedor (allowlist aplicada no serviço)
  body('biografia').optional({ values: 'null' }).isString().isLength({ max: 5000 }).withMessage('Biografia deve ter no máximo 5000 caracteres'),
  body('endereco').optional({ values: 'null' }).isString().isLength({ max: 255 }).withMessage('Endereço inválido'),
  body('cidade').optional({ values: 'null' }).isString().isLength({ max: 100 }).withMessage('Cidade inválida'),
  body('provincia').optional({ values: 'null' }).isString().isLength({ max: 100 }).withMessage('Província inválida'),
  body('whatsapp').optional({ values: 'falsy' }).matches(/^\+?[0-9 ]{9,20}$/).withMessage('WhatsApp inválido'),
  body('telefone_publico').optional({ values: 'falsy' }).matches(/^\+?[0-9 ]{9,20}$/).withMessage('Telefone público inválido'),
  body('email_publico').optional({ values: 'falsy' }).isEmail().withMessage('Email público inválido'),
  body('instagram').optional({ values: 'null' }).isString().isLength({ max: 100 }).withMessage('Instagram inválido'),
  body('facebook').optional({ values: 'null' }).isString().isLength({ max: 100 }).withMessage('Facebook inválido'),
  body('website').optional({ values: 'null' }).isString().isLength({ max: 100 }).withMessage('Website inválido'),
  body('latitude').optional({ values: 'falsy' }).isFloat({ min: -90, max: 90 }).withMessage('Latitude inválida (-90 a 90)'),
  body('longitude').optional({ values: 'falsy' }).isFloat({ min: -180, max: 180 }).withMessage('Longitude inválida (-180 a 180)')
];

export const updatePasswordValidation = [
  body('senha_atual').notEmpty().withMessage('Senha atual é obrigatória'),
  body('nova_senha')
    .isLength({ min: 6 })
    .withMessage('Nova senha deve ter no mínimo 6 caracteres')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('Nova senha deve conter pelo menos uma letra e um número')
];

export const updateFotoValidation = [
  body('foto_url').isURL().withMessage('URL da foto inválida')
];

export const favoritoIdValidation = [
  param('id_fazedor').isUUID().withMessage('ID do fazedor inválido')
];

export const verifyEmailValidation = [
  body('userId')
    .isUUID()
    .withMessage('ID de usuário inválido'),

  body('codigo')
    .notEmpty()
    .withMessage('Código de verificação é obrigatório')
    .isLength({ min: 6, max: 6 })
    .withMessage('Código deve ter 6 dígitos')
    .matches(/^\d+$/)
    .withMessage('Código deve conter apenas números')
];

export const requestPasswordResetValidation = [
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail()
    .toLowerCase()
];

export const verifyPasswordResetOTPValidation = [
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail()
    .toLowerCase(),
  body('codigo')
    .notEmpty()
    .withMessage('Código é obrigatório')
    .isLength({ min: 6, max: 6 })
    .withMessage('Código deve ter 6 dígitos')
    .matches(/^\d+$/)
    .withMessage('Código deve conter apenas números')
];

export const resetPasswordWithOTPValidation = [
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail()
    .toLowerCase(),
  body('codigo')
    .notEmpty()
    .withMessage('Código é obrigatório')
    .isLength({ min: 6, max: 6 })
    .withMessage('Código deve ter 6 dígitos')
    .matches(/^\d+$/)
    .withMessage('Código deve conter apenas números'),
  body('nova_senha')
    .isLength({ min: 6 })
    .withMessage('Nova senha deve ter no mínimo 6 caracteres')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('Nova senha deve conter pelo menos uma letra e um número')
];

export const resendOTPValidation = [
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail()
    .toLowerCase()
];

export const refreshTokenValidation = [
  body('refreshToken')
    .isString()
    .withMessage('Refresh token é obrigatório')
    .isLength({ min: 20, max: 500 })
    .withMessage('Refresh token inválido')
];
