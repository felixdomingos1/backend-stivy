import { body, query } from 'express-validator';

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
    .isUUID()
    .trim(),

  body('valor')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Valor deve ser um número positivo')
    .toFloat(),

  body('tempo_estimado')
    .optional()
    .isUUID()
    .trim()
];

export const listarServicosValidation = [
  query('categoria')
    .optional()
    .isUUID()
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
      if (min && max && max < min) {
        throw new Error('Valor máximo deve ser maior que valor mínimo');
      }
      return true;
    })
];

export const createEventoValidation = [
  body('titulo')
    .notEmpty()
    .withMessage('Título é obrigatório')
    .trim()
    .isLength({ min: 3, max: 150 }),

  body('descricao')
    .optional()
    .trim(),

  body('data_inicio')
    .isISO8601()
    .withMessage('Data de início inválida')
    .toDate(),

  body('data_fim')
    .isISO8601()
    .withMessage('Data de fim inválida')
    .toDate()
    .custom((end, { req }) => {
      if (end <= req.body.data_inicio) {
        throw new Error('Data de fim deve ser maior que data de início');
      }
      return true;
    }),

  body('tipo_evento')
    .isIn(['desfile', 'workshop', 'casting', 'fashion_week', 'concurso', 'outro'])
    .withMessage('Tipo de evento inválido'),

  body('local')
    .optional()
    .trim(),

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
