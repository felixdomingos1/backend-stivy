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
    .matches(/^[0-9]{9,11}$/)
    .withMessage('Telefone inválido'),

  body('tipo')
    .isIn(['fazedor', 'apreciador'])
    .withMessage('Tipo inválido'),

  body('tipo_fazedor')
    .optional()
    .isIn(['agencia', 'estilista', 'maquiador', 'fotografo', 'modelo_freelancer', 'videografo', 'designer', 'influenciador', 'criador_conteudo', 'cabeleireiro', 'barbeiro', 'produtor_eventos', 'publicidade', 'marketing', 'desfiles', 'casting', 'moda', 'outros'])
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
  body('nome').optional().isLength({ min: 3 }).withMessage('Nome deve ter no mínimo 3 caracteres'),
  body('telefone').optional().matches(/^[0-9]{9,11}$/).withMessage('Telefone inválido'),
  body('bio').optional().isLength({ max: 500 }).withMessage('Bio deve ter no máximo 500 caracteres'),
  body('nome_artistico').optional().isLength({ max: 100 }).withMessage('Nome artístico inválido'),
  body('altura').optional().isDecimal().withMessage('Altura inválida'),
  body('peso').optional().isDecimal().withMessage('Peso inválido'),
  body('busto').optional().isInt({ min: 0 }).withMessage('Busto inválido'),
  body('cintura').optional().isInt({ min: 0 }).withMessage('Cintura inválida'),
  body('quadril').optional().isInt({ min: 0 }).withMessage('Quadril inválido'),
  body('sapato').optional().isInt({ min: 0 }).withMessage('Sapato inválido'),
  body('roupa').optional().isInt({ min: 0 }).withMessage('Roupa inválida'),
  body('cabelo').optional().isLength({ max: 50 }).withMessage('Cor de cabelo inválida'),
  body('olhos').optional().isLength({ max: 50 }).withMessage('Cor dos olhos inválida'),
  body('idade').optional().isInt({ min: 0, max: 120 }).withMessage('Idade inválida'),
  body('nacionalidade').optional().isLength({ max: 50 }).withMessage('Nacionalidade inválida'),
  body('experiencia').optional().isLength({ max: 1000 }).withMessage('Experiência deve ter no máximo 1000 caracteres'),
  body('habilidades').optional().isLength({ max: 1000 }).withMessage('Habilidades devem ter no máximo 1000 caracteres'),
  body('status_modelo').optional().isIn(['disponivel', 'indisponivel']).withMessage('Status inválido')
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
