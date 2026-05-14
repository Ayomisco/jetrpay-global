import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    logger.warn({
      error: err.message,
      code: err.code,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method
    }, 'AppError');

    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code || 'INTERNAL_ERROR',
        statusCode: err.statusCode
      }
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        details: err.errors
      }
    });
  }

  // Unknown error
  logger.error({
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  }, 'Unhandled error');

  res.status(500).json({
    error: {
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal Server Error' 
        : err.message,
      code: 'INTERNAL_SERVER_ERROR',
      statusCode: 500
    }
  });
};

// Error factory functions
export const createError = {
  notFound: (message: string = 'Not found', code: string = 'NOT_FOUND') =>
    new AppError(404, message, code),
  
  unauthorized: (message: string = 'Unauthorized', code: string = 'UNAUTHORIZED') =>
    new AppError(401, message, code),
  
  forbidden: (message: string = 'Forbidden', code: string = 'FORBIDDEN') =>
    new AppError(403, message, code),
  
  badRequest: (message: string = 'Bad request', code: string = 'BAD_REQUEST') =>
    new AppError(400, message, code),
  
  conflict: (message: string = 'Conflict', code: string = 'CONFLICT') =>
    new AppError(409, message, code),
  
  unprocessableEntity: (message: string = 'Unprocessable entity', code: string = 'UNPROCESSABLE_ENTITY') =>
    new AppError(422, message, code),
  
  tooManyRequests: (message: string = 'Too many requests', code: string = 'TOO_MANY_REQUESTS') =>
    new AppError(429, message, code),
  
  internalError: (message: string = 'Internal server error', code: string = 'INTERNAL_ERROR') =>
    new AppError(500, message, code),

  serviceUnavailable: (message: string = 'Service unavailable', code: string = 'SERVICE_UNAVAILABLE') =>
    new AppError(503, message, code)
};
