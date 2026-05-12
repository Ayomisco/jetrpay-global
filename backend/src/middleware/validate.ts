import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createError } from '@/middleware/errorHandler';

const uuidSchema = z.string().uuid();

export const validateUUID = (...params: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const param of params) {
      const result = uuidSchema.safeParse(req.params[param]);
      if (!result.success) {
        return next(createError.badRequest(`Invalid ${param}: must be a valid UUID`, 'INVALID_UUID'));
      }
    }
    next();
  };
};
