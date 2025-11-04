import * as jwt from 'jsonwebtoken';
import { logger } from '../utils';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

interface JwtResult<T = Record<string, unknown>> {
  success: boolean;
  token?: string;
  payload?: T;
  error?: string;
}

export const jwtService = {
  sign(payload: string | object, expiresIn: string = JWT_EXPIRES_IN): JwtResult {
    try {
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
      return {
        success: true,
        token,
      };
    } catch (error) {
      logger.error('JWT token creation failed', { error });
      return { success: false, error: 'TOKEN_CREATION_FAILED' };
    }
  },

  verify<T = Record<string, unknown>>(token: string): JwtResult<T> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as T;
      return { success: true, payload: decoded };
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.name === 'TokenExpiredError') {
          return { success: false, error: 'TOKEN_EXPIRED' };
        }
        if (error.name === 'JsonWebTokenError') {
          return { success: false, error: 'TOKEN_INVALID' };
        }
      }
      logger.error('JWT token verification failed', { error });
      return { success: false, error: 'TOKEN_VERIFICATION_FAILED' };
    }
  },

  decode<T = Record<string, unknown>>(token: string): JwtResult<T> {
    try {
      const decoded = jwt.decode(token) as T;
      return decoded
        ? { success: true, payload: decoded }
        : { success: false, error: 'TOKEN_MALFORMED' };
    } catch (error) {
      logger.error('JWT token decode failed', { error });
      return { success: false, error: 'TOKEN_DECODE_FAILED' };
    }
  },
};
