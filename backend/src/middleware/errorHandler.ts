import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Erreur interne du serveur';

  // Prisma errors
  if (err.code === 'P2002') {
    statusCode = 409;
    message = 'Cette ressource existe déjà';
  } else if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Ressource non trouvée';
  } else if (err.code === 'P2003') {
    statusCode = 400;
    message = 'Référence invalide';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token invalide';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expiré';
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    statusCode = 422;
    message = err.message;
  }

  if (statusCode === 500) {
    logger.error(`Unhandled error: ${err.message}`, { stack: err.stack, url: req.url, method: req.method });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
