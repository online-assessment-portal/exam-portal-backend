import { NextFunction, Request, Response } from 'express';
import createErr from 'http-errors';
import { LoggerWrapper } from '../utils/logging';

export type UserRole = 'user' | 'admin';

export interface AuthenticatedRequest extends Request {
  user?: {
    email: string;
    role: UserRole;
  };
}

export const requireAuth = (allowedRoles: UserRole[] = ['user', 'admin']) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const log = new LoggerWrapper(req);

    try {
      const isUserLoggedIn = req.session?.loggedIn;
      const isAdminLoggedIn = req.session?.adminLogged;
      const email = req.session?.email;

      if (!email || (!isUserLoggedIn && !isAdminLoggedIn)) {
        log.warn('Authentication required - no valid session');
        return next(createErr.Unauthorized('Authentication required'));
      }

      const userRole: UserRole = isAdminLoggedIn ? 'admin' : 'user';

      if (!allowedRoles.includes(userRole)) {
        log.warn('Access denied - insufficient permissions', {
          email,
          userRole,
          allowedRoles,
        });
        return next(createErr.Forbidden('Insufficient permissions'));
      }

      req.user = { email, role: userRole };
      log.info('Authentication successful', { email, role: userRole });
      next();
    } catch (error: unknown) {
      log.error('Authentication middleware error', error);
      return next(createErr.InternalServerError('Authentication error'));
    }
  };
};

export const requireUser = requireAuth(['user']);
export const requireAdmin = requireAuth(['admin']);
export const requireAny = requireAuth(['user', 'admin']);
