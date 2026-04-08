import { body, param } from 'express-validator';

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
    .matches(/^[0-9]{10,11}$/)
    .withMessage('Telefone inválido'),

  body('tipo')
    .isIn(['fazedor', 'apreciador'])
    .withMessage('Tipo inválido'),

  body('tipo_fazedor')
    .optional()
    .isIn(['agencia', 'estilista', 'maquiador', 'fotografo', 'modelo_freelancer'])
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

export const resendOTPValidation = [
  body('userId').isUUID().withMessage('ID inválido')
];

export const updateProfileValidation = [
  body('nome').optional().isLength({ min: 3 }).withMessage('Nome deve ter no mínimo 3 caracteres'),
  body('telefone').optional().matches(/^[0-9]{9,11}$/).withMessage('Telefone inválido'),
  body('bio').optional().isLength({ max: 500 }).withMessage('Bio deve ter no máximo 500 caracteres')
];

export const updatePasswordValidation = [
  body('senha_atual').notEmpty().withMessage('Senha atual é obrigatória'),
  body('nova_senha').isLength({ min: 6 }).withMessage('Nova senha deve ter no mínimo 6 caracteres')
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
    .withMessage('Código deve ter 6 dígitos'),
  body('nova_senha')
    .isLength({ min: 6 })
    .withMessage('Nova senha deve ter no mínimo 6 caracteres')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('Nova senha deve conter pelo menos uma letra e um número')
];
