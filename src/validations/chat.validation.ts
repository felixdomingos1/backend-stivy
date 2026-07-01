import { body, param, query } from 'express-validator';

export const createConversationValidation = [
  body('tipo')
    .isIn(['direct', 'grupo'])
    .withMessage('Tipo deve ser direct ou grupo'),

  body('titulo')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Título deve ter no máximo 100 caracteres'),

  body('participantes')
    .isArray({ min: 1 })
    .withMessage('Deve ter pelo menos um participante'),

  body('participantes.*')
    .isUUID()
    .withMessage('ID de participante inválido'),
];

export const sendMessageValidation = [
  param('id')
    .isUUID()
    .withMessage('ID da conversa inválido'),

  body('conteudo')
    .trim()
    .notEmpty()
    .withMessage('Conteúdo é obrigatório')
    .isLength({ max: 5000 })
    .withMessage('Conteúdo deve ter no máximo 5000 caracteres'),

  body('tipo')
    .optional()
    .isIn(['texto', 'imagem', 'arquivo'])
    .withMessage('Tipo deve ser texto, imagem ou arquivo'),
];

export const getConversationMessagesValidation = [
  param('id')
    .isUUID()
    .withMessage('ID da conversa inválido'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .toInt()
    .withMessage('Página inválida'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt()
    .withMessage('Limite inválido'),
];

export const conversationIdValidation = [
  param('id')
    .isUUID()
    .withMessage('ID da conversa inválido'),
];

export const messageIdValidation = [
  param('id')
    .isUUID()
    .withMessage('ID da mensagem inválido'),
];
