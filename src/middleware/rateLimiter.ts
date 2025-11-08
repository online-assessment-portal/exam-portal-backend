import { NextFunction, Request, Response } from 'express';
import createErr from 'http-errors';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { redisService } from '../services/redis';
import { getClientIP, LoggerWrapper } from '../utils';

const ERROR_MESSAGES = {
  EMAIL_REQUIRED: 'Email is required',
  TOO_MANY_REQUESTS: '',
} as const;

const rateLimiter = new RateLimiterRedis({
  storeClient: redisService.getClient(),
  keyPrefix: 'allRequests',
  points: 25,
  duration: 1, // 1 second
});

export const rateLimiterMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const myIP = getClientIP(req);
  const logger = new LoggerWrapper(req);
  rateLimiter
    .consume(myIP)
    .then(() => next())
    .catch(() => {
      logger.warn('Rate limit exceeded', { ip: myIP, path: req.path });
      next(createErr.TooManyRequests('Too many requests'));
    });
};

export const signInLimiterUserIP = new RateLimiterRedis({
  storeClient: redisService.getClient(),
  keyPrefix: 'signInLimit:userIP',
  points: 5,
  duration: 60 * 15, // 15 minutes
  blockDuration: 60 * 15, // 15 minutes
});

export const signInLimiterGlobal = new RateLimiterRedis({
  storeClient: redisService.getClient(),
  keyPrefix: 'signInLimit:global',
  points: 10,
  duration: 60 * 60, // 1 hour
  blockDuration: 60 * 60, // 1 hour
});

export const otpMailLimiterUserIP = new RateLimiterRedis({
  storeClient: redisService.getClient(),
  keyPrefix: 'otpMailLimit:userIP',
  points: 5,
  duration: 60 * 60, // 1 hour
  blockDuration: 60 * 15, // 15 minutes
});

export const otpMailLimiterGlobal = new RateLimiterRedis({
  storeClient: redisService.getClient(),
  keyPrefix: 'otpMailLimit:global',
  points: 3,
  duration: 60 * 10, // 10 minutes
  blockDuration: 60 * 10, // 10 minutes
});

export const otpVerifyLimiterUserIP = new RateLimiterRedis({
  storeClient: redisService.getClient(),
  keyPrefix: 'otpVerifyLimit:userIP',
  points: 5,
  duration: 60 * 60, // 1 hour
  blockDuration: 60 * 15, // 15 minutes
});

export const otpVerifyLimiterGlobal = new RateLimiterRedis({
  storeClient: redisService.getClient(),
  keyPrefix: 'otpVerifyLimit:global',
  points: 5,
  duration: 60 * 10, // 10 minutes
  blockDuration: 60 * 10, // 10 minutes
});

export const signinRateLimitMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // return next();
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return next(createErr.BadRequest(ERROR_MESSAGES.EMAIL_REQUIRED));
  }

  const myIP = getClientIP(req);
  const ipUserKey = `${email}:${myIP}`;

  Promise.all([signInLimiterGlobal.consume(email), signInLimiterUserIP.consume(ipUserKey)])
    .then(() => next())
    .catch(() => {
      const logger = new LoggerWrapper(req);
      logger.warn('Signin rate limit exceeded', { email, ip: myIP });
      next(createErr.TooManyRequests('Too many signin attempts. Please try again after few mins.'));
    });
};

export const otpMailRateLimitMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // return next();
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return next(createErr.BadRequest(ERROR_MESSAGES.EMAIL_REQUIRED));
  }

  const myIP = getClientIP(req);
  const ipUserKey = `${email}:${myIP}`;

  Promise.all([otpMailLimiterGlobal.consume(email), otpMailLimiterUserIP.consume(ipUserKey)])
    .then(() => next())
    .catch(() => {
      const logger = new LoggerWrapper(req);
      logger.warn('OTP mail rate limit exceeded', { email, ip: myIP });
      next(createErr.TooManyRequests('Too many OTP requests. Please try again after few mins.'));
    });
};

export const otpVerifyRateLimitMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // return next();
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return next(createErr.BadRequest(ERROR_MESSAGES.EMAIL_REQUIRED));
  }

  const myIP = getClientIP(req);
  const ipUserKey = `${email}:${myIP}`;

  Promise.all([otpVerifyLimiterGlobal.consume(email), otpVerifyLimiterUserIP.consume(ipUserKey)])
    .then(() => next())
    .catch(() => {
      const logger = new LoggerWrapper(req);
      logger.warn('OTP verify rate limit exceeded', { email, ip: myIP });
      next(
        createErr.TooManyRequests(
          'Too many OTP verification attempts. Please try again after few mins.',
        ),
      );
    });
};
// TODO:delete rate limiting after success
