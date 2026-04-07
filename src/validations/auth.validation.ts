import { body } from 'express-validator';

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
