import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export const validate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const lista = errors.array().map((err: any) => ({
      field: err.path ?? err.param,
      message: err.msg
    }));
    res.status(400).json({
      success: false,
      error: lista[0]?.message || 'Erro de validação',
      errors: lista
    });
    return;
  }

  next();
};
