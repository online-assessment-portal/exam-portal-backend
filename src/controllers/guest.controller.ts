import { NextFunction, Request, Response } from 'express';
import { ContactService } from '../services/guest.service';
import { LoggerWrapper } from '../utils/logging';
import { ApiResponse } from '../utils/response';
import { ContactValidation } from '../validation/guest.validation';
import { ApiResponse as ApiResponseType } from '../types/auth.types';

export class ContactController {
  static async contactUs(
    req: Request,
    res: Response<ApiResponseType>,
    next: NextFunction,
  ): Promise<void> {
    const log = new LoggerWrapper(req);
    try {
      const value = await ContactValidation.contactSchema.validateAsync(req.body);
      log.logUserAction('Contact form submission', value.email);

      await ContactService.submitContactForm(value);

      log.logUserAction('Contact form submitted successfully', value.email);
      return ApiResponse.success(
        res,
        'Your message has been sent successfully. We will get back to you soon.',
      );
    } catch (error: unknown) {
      log.error('Contact form submission error', error);
      return next(error);
    }
  }
}
