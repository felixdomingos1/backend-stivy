import { body, param, query } from 'express-validator';

export const createConversationValidation = [
  body('tipo')
    .optional()
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

  // conteudo é opcional quando se envia uma imagem (multipart `imagem`); o serviço valida
  body('conteudo')
    .optional({ values: 'null' })
    .isString()
    .withMessage('Conteúdo deve ser texto')
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Conteúdo deve ter no máximo 5000 caracteres'),

  body('tipo')
    .optional()
    .isIn(['texto', 'imagem'])
    .withMessage('Tipo deve ser texto ou imagem'),
];

export const getConversationMessagesValidation = [
  param('id')
    .isUUID()
    .withMessage('ID da conversa inválido'),

  query('before')
    .optional()
    .isISO8601()
    .withMessage('before deve ser uma data ISO 8601'),

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
