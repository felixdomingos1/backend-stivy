// validations/fashion.validation.ts
import { body, query, param } from 'express-validator';

// Validações para Serviços
export const createServicoValidation = [
  body('titulo')
    .notEmpty()
    .withMessage('Título é obrigatório')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Título deve ter entre 3 e 100 caracteres'),

  body('descricao')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Descrição deve ter no máximo 500 caracteres'),

  body('categoria')
    .optional()
    .trim()
    .isString()
    .withMessage('Categoria deve ser texto'),

  body('valor')
    .optional()
    .isFloat({ min: 0, max: 999999.99 })
    .withMessage('Valor deve ser um número positivo')
    .toFloat(),

  body('tempo_estimado')
    .optional()
    .trim()
    .isString()
    .withMessage('Tempo estimado deve ser texto')
];

export const updateServicoValidation = [
  param('id')
    .isUUID()
    .withMessage('ID do serviço inválido'),

  body('titulo')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Título deve ter entre 3 e 100 caracteres'),

  body('descricao')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Descrição deve ter no máximo 500 caracteres'),

  body('categoria')
    .optional()
    .trim(),

  body('valor')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Valor deve ser um número positivo')
    .toFloat(),

  body('status')
    .optional()
    .isIn(['ativo', 'inativo', 'pausado'])
    .withMessage('Status inválido'),

  body('tempo_estimado')
    .optional()
    .trim()
];

export const listServicosValidation = [
  query('categoria')
    .optional()
    .trim(),

  query('min_valor')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Valor mínimo inválido')
    .toFloat(),

  query('max_valor')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Valor máximo inválido')
    .toFloat()
    .custom((max, { req }) => {
      const min = req.query && req.query.min_valor;
      if (min && max && parseFloat(max) < parseFloat(min as string)) {
        throw new Error('Valor máximo deve ser maior que valor mínimo');
      }
      return true;
    }),

  query('status')
    .optional()
    .isIn(['ativo', 'inativo', 'pausado'])
    .withMessage('Status inválido'),

  query('search')
    .optional()
    .trim(),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page deve ser um número positivo')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit deve ser entre 1 e 100')
    .toInt()
];

// Validações para Fazedores
export const listFazedoresValidation = [
  query('tipo_fazedor')
    .optional()
    .isIn(['agencia', 'estilista', 'maquiador', 'fotografo', 'modelo_freelancer'])
    .withMessage('Tipo de fazedor inválido'),

  query('status_aprovacao')
    .optional()
    .isIn(['pendente', 'aprovado', 'rejeitado'])
    .withMessage('Status de aprovação inválido'),

  query('avaliacao_minima')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Avaliação mínima deve ser entre 0 e 5')
    .toFloat(),

  query('search')
    .optional()
    .trim(),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt()
];

export const getFazedorByIdValidation = [
  param('id')
    .isUUID()
    .withMessage('ID do fazedor inválido')
];

// Validações para Avaliações
export const createAvaliacaoValidation = [
  body('id_fazedor')
    .isUUID()
    .withMessage('ID do fazedor inválido'),

  body('nota')
    .notEmpty()
    .withMessage('Nota é obrigatória')
    .isInt({ min: 1, max: 5 })
    .withMessage('Nota deve ser entre 1 e 5')
    .toInt(),

  body('comentario')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Comentário deve ter no máximo 500 caracteres')
];

export const listAvaliacoesValidation = [
  param('id_fazedor')
    .isUUID()
    .withMessage('ID do fazedor inválido'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt()
];
