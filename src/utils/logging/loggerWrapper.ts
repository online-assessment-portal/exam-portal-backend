import { Request } from 'express';
import { logger } from './index';
import { sanitizeUserIdentifier, sanitizeError } from './sanitizers';

/**
 * Enhanced logger that automatically includes requestId and common context
 */
export class LoggerWrapper {
  private requestId: string;
  private context: Record<string, unknown>;

  constructor(req: Request, additionalContext: Record<string, unknown> = {}) {
    this.requestId = req.requestId;
    this.context = { requestId: this.requestId, ...additionalContext };
  }

  info(message: string, data?: Record<string, unknown>): void {
    logger.info(message, { ...this.context, ...data });
  }

  warn(message: string, data?: Record<string, unknown>): void {
    logger.warn(message, { ...this.context, ...data });
  }

  error(message: string, error?: unknown, data?: Record<string, unknown>): void {
    const errorData = error ? sanitizeError(error) : {};
    logger.error(message, { ...this.context, ...errorData, ...data });
  }

  logUserAction(action: string, identifier: string, data?: Record<string, unknown>): void {
    this.info(action, { identifier: sanitizeUserIdentifier(identifier), ...data });
  }

  logUserError(action: string, identifier: string, error?: unknown): void {
    this.error(action, error, { identifier: sanitizeUserIdentifier(identifier) });
  }

  sanitizeUserIdentifier(identifier: string): string {
    return identifier;
    // return sanitizeUserIdentifier(identifier);
  }
}
