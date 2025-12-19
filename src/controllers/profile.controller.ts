import { NextFunction, Response } from 'express';
import createErr from 'http-errors';
import { cookieObj } from '../../helpers/common';
import { AuthenticatedRequest } from '../middleware/auth';
import { ProfileService, ProfileUpdateData } from '../services/profile.service';
import { ApiResponse as ApiResponseType } from '../types/auth.types';
import { LoggerWrapper } from '../utils/logging';
import { ApiResponse } from '../utils/response';
import { ProfileValidation } from '../validation/profile.validation';

export class ProfileController {
  /**
   * Get user profile
   */
  static async getProfile(
    req: AuthenticatedRequest,
    res: Response<ApiResponseType>,
    next: NextFunction,
  ): Promise<void> {
    const log = new LoggerWrapper(req);
    try {
      const email = req.user!.email;
      log.logUserAction('Profile fetch requested', email);

      const profile = await ProfileService.getProfile(email);
      if (!profile) {
        log.logUserError('Profile not found', email);
        return next(createErr.NotFound('Profile not found'));
      }

      log.logUserAction('Profile fetched successfully', email);
      return ApiResponse.success(res, 'Profile retrieved successfully', { profile });
    } catch (error: unknown) {
      log.error('Profile fetch error', error);
      return next(error);
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(
    req: AuthenticatedRequest & { body: ProfileUpdateData },
    res: Response<ApiResponseType>,
    next: NextFunction,
  ): Promise<void> {
    const log = new LoggerWrapper(req);
    try {
      const email = req.user!.email;
      const updateData = await ProfileValidation.update.validateAsync(req.body);
      log.logUserAction('Profile update requested', email);

      const updatedProfile = await ProfileService.updateProfile(email, updateData);

      if (updatedProfile) {
        res.cookie('uname', updatedProfile.uname, cookieObj);
        res.cookie('name', updatedProfile.name, cookieObj);

        log.logUserAction('Profile updated successfully', email);
        return ApiResponse.success(res, 'Profile updated successfully', {
          profile: updatedProfile,
        });
      } else {
        log.logUserError('Profile update failed', email);
        return next(createErr.InternalServerError('Profile update failed'));
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'USERNAME_ALREADY_EXISTS') {
        return next(
          createErr.Conflict('This username is already taken. Please choose a different username.'),
        );
      }
      log.error('Profile update error', error);
      return next(error);
    }
  }
}
