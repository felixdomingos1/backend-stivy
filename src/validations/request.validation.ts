import { body, query, param } from 'express-validator';

export const requisitarServicoValidation = [
  param('id_servico')
    .isUUID()
    .withMessage('ID do serviço inválido'),

  body('mensagem')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Mensagem deve ter no máximo 500 caracteres'),

  body('contato_retorno')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Contato deve ter no máximo 100 caracteres')
];

export const requisitarModeloValidation = [
  param('id_modelo')
    .isUUID()
    .withMessage('ID do modelo inválido'),

  body('mensagem')
    .optional()
    .trim()
    .isLength({ max: 500 }),

  body('contato_retorno')
    .optional()
    .trim()
    .isLength({ max: 100 })
];

export const getRequisicaoByIdValidation = [
  param('id')
    .isUUID()
    .withMessage('ID da requisição inválido')
];

export const listRequisicoesValidation = [
  query('status')
    .optional()
    .isIn(['pendente', 'aceita', 'recusada', 'concluida', 'cancelada'])
    .withMessage('Status inválido'),

  query('data_inicio')
    .optional()
    .isISO8601()
    .toDate(),

  query('data_fim')
    .optional()
    .isISO8601()
    .toDate(),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt()
];

export const aceitarRequisicaoValidation = [
  param('id')
    .isUUID()
    .withMessage('ID da requisição inválido')
];

export const recusarRequisicaoValidation = [
  param('id')
    .isUUID()
    .withMessage('ID da requisição inválido'),

  body('motivo')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Motivo deve ter no máximo 500 caracteres')
];

export const cancelarRequisicaoValidation = [
  param('id')
    .isUUID()
    .withMessage('ID da requisição inválido')
];

export const concluirRequisicaoValidation = [
  param('id')
    .isUUID()
    .withMessage('ID da requisição inválido')
];
