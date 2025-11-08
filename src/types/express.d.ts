import { Request as ExpressRequest, Response as ExpressResponse } from 'express';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      session: {
        loggedIn?: boolean;
        email?: string;
        adminLogged?: boolean;
        destroy(callback: (error?: Error) => void): void;
      };
    }
  }
}