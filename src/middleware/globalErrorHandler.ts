import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils';
import { isDev } from '../config/constants';

interface AppError extends Error {
  status?: number;
  isJoi?: boolean;
}

const globalErrorHandler = (err: AppError, req: Request, res: Response, _next: NextFunction) => {
  let message = 'Internal server error';
  let status = err.status || 500;

  // Handle specific error types with safe messages
  if (err.isJoi) {
    status = 422;
    message = err.message; // Joi messages are safe to expose
  } else if (err.name === 'MongoError' || err.name === 'MongooseError') {
    message = 'Service temporarily unavailable. Please try again later.';
    status = 503;
  } else if (err.name === 'RedisError' || err.name === 'ReplyError' || err.name === 'AbortError') {
    message = 'Service temporarily unavailable. Please try again later.';
    status = 503;
  } else if (status < 500) {
    message = err.message; // Client errors (4xx) are safe to expose
  }

  // Log all errors with full details
  logger.error(`${req.method} ${req.path}`, {
    requestId: req.requestId,
    message: err.message,
    status,
    ...(isDev && { stack: err.stack }),
    ...(err.name && { name: err.name }),
  });

  res.status(status).json({
    success: false,
    message,
    ...(isDev && status < 500 && { stack: err.stack }), // Only show stack for client errors in dev
  });
};

export default globalErrorHandler;
