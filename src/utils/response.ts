import { Response } from 'express';

interface SuccessResponse {
  success: true;
  message?: string;
  data?: unknown;
}

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export class ApiResponse {
  static success(res: Response, message?: string, data?: unknown, statusCode = 200): void {
    const response: SuccessResponse = { success: true };
    if (message) response.message = message;
    if (data) response.data = data;

    res.status(statusCode).json(response);
  }

  static error(res: Response, code: string, message: string, statusCode = 400): void {
    const response: ErrorResponse = {
      success: false,
      error: { code, message },
    };

    res.status(statusCode).json(response);
  }

  static delayedSuccess(res: Response, message: string, delay?: number): void {
    const randomDelay = delay || Math.random() * 100 + 50;
    setTimeout(() => {
      ApiResponse.success(res, message);
    }, randomDelay);
  }

  static delayedError(res: Response, code: string, message: string, delay?: number): void {
    const randomDelay = delay || Math.random() * 100 + 50;
    setTimeout(() => {
      ApiResponse.error(res, code, message);
    }, randomDelay);
  }
}
