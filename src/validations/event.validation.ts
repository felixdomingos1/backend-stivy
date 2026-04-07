// validations/event.validation.ts
import { body, query, param } from 'express-validator';

export const createEventoValidation = [
  body('titulo')
    .notEmpty()
    .withMessage('Título é obrigatório')
    .trim()
    .isLength({ min: 3, max: 150 })
    .withMessage('Título deve ter entre 3 e 150 caracteres'),

  body('descricao')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Descrição deve ter no máximo 1000 caracteres'),

  body('local')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Local deve ter no máximo 255 caracteres'),

  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude inválida')
    .toFloat(),

  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude inválida')
    .toFloat(),

  body('data_inicio')
    .notEmpty()
    .withMessage('Data de início é obrigatória')
    .isISO8601()
    .withMessage('Data de início inválida')
    .toDate()
    .custom((value) => {
      if (value < new Date()) {
        throw new Error('Data de início não pode ser no passado');
      }
      return true;
    }),

  body('data_fim')
    .notEmpty()
    .withMessage('Data de fim é obrigatória')
    .isISO8601()
    .withMessage('Data de fim inválida')
    .toDate()
    .custom((end, { req }) => {
      const start = req.body.data_inicio;
      if (start && end <= new Date(start)) {
        throw new Error('Data de fim deve ser maior que data de início');
      }
      return true;
    }),

  body('tipo_evento')
    .notEmpty()
    .withMessage('Tipo de evento é obrigatório')
    .isIn(['desfile', 'workshop', 'casting', 'fashion_week', 'concurso', 'outro'])
    .withMessage('Tipo de evento inválido'),

  body('vagas_disponiveis')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Vagas deve ser um número positivo')
    .toInt(),

  body('valor_ingresso')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Valor do ingresso deve ser positivo')
    .toFloat()
];

export const updateEventoValidation = [
  param('id')
    .isUUID()
    .withMessage('ID do evento inválido'),

  body('titulo')
    .optional()
    .trim()
    .isLength({ min: 3, max: 150 }),

  body('descricao')
    .optional()
    .trim(),

  body('local')
    .optional()
    .trim(),

  body('data_inicio')
    .optional()
    .isISO8601()
    .toDate(),

  body('data_fim')
    .optional()
    .isISO8601()
    .toDate()
    .custom((end, { req }) => {
      const start = req.body.data_inicio;
      if (start && end && end <= new Date(start)) {
        throw new Error('Data de fim deve ser maior que data de início');
      }
      return true;
    }),

  body('tipo_evento')
    .optional()
    .isIn(['desfile', 'workshop', 'casting', 'fashion_week', 'concurso', 'outro']),

  body('status')
    .optional()
    .isIn(['ativo', 'cancelado', 'concluido'])
    .withMessage('Status inválido'),

  body('vagas_disponiveis')
    .optional()
    .isInt({ min: 0 })
    .toInt(),

  body('valor_ingresso')
    .optional()
    .isFloat({ min: 0 })
    .toFloat()
];

export const listEventosValidation = [
  query('tipo')
    .optional()
    .isIn(['desfile', 'workshop', 'casting', 'fashion_week', 'concurso', 'outro']),

  query('status')
    .optional()
    .isIn(['ativo', 'cancelado', 'concluido']),

  query('data_inicio')
    .optional()
    .isISO8601()
    .toDate(),

  query('data_fim')
    .optional()
    .isISO8601()
    .toDate(),

  query('search')
    .optional()
    .trim(),

  query('proximos')
    .optional()
    .isBoolean()
    .toBoolean(),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt()
];

export const participarEventoValidation = [
  param('id')
    .isUUID()
    .withMessage('ID do evento inválido')
];

export const getEventoByIdValidation = [
  param('id')
    .isUUID()
    .withMessage('ID do evento inválido')
];

export const listParticipantesValidation = [
  param('id')
    .isUUID()
    .withMessage('ID do evento inválido'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt()
];
