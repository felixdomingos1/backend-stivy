import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export const validate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        message: err.msg
      }))
    });
    return;
  }

  next();
};
