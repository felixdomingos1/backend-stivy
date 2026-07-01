import { body, param } from 'express-validator';

export const createStoryValidation = [
  body('texto')
    .optional()
    .isString().withMessage('Texto deve ser uma string')
    .isLength({ max: 255 }).withMessage('Texto deve ter no máximo 255 caracteres'),
  body('cor_fundo')
    .optional()
    .isString().withMessage('Cor de fundo deve ser uma string')
    .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Cor de fundo deve ser um hex válido (#FFFFFF)'),
  body('duracao')
    .optional()
    .isInt({ min: 3, max: 60 }).withMessage('Duração deve estar entre 3 e 60 segundos'),
];

export const storyIdValidation = [
  param('id')
    .isUUID().withMessage('ID de story inválido'),
];

export const visualizarStoryValidation = [
  param('id')
    .isUUID().withMessage('ID de story inválido'),
];
