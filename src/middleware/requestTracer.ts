import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../utils';

declare module 'express-serve-static-core' {
  interface Request {
    requestId: string;
  }
}

export const requestTracer = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = randomUUID();
  const startTime = Date.now();

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  logger.info('Request started', {
    requestId,
    method: req.method,
    url: req.url,
  });

  const cleanup = () => {
    const duration = Date.now() - startTime;

    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${duration}ms`);
    }

    logger.info('Request completed', {
      requestId,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  };

  res.once('finish', cleanup);

  next();
};
