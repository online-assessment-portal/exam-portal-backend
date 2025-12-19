import { NextFunction, Request, Response } from 'express';
import createErr from 'http-errors';
import { AuthService } from '../services/auth.service';

import { isUserLogged, processSignIn } from '../../helpers/common';
import {
  ApiResponse as ApiResponseType,
  CompleteRequest,
  SendOtpRequest,
  SigninRequest,
  VerifyOtpRequest,
} from '../types/auth.types';
import { LoggerWrapper } from '../utils/logging';
import { ApiResponse } from '../utils/response';
import { AuthValidation } from '../validation/auth.validation';

interface VerificationTokenPayload {
  email: string;
  purpose: 'register' | 'reset';
  type: 'verify';
}

// Constants for error messages
const ERROR_MESSAGES = {
  INVALID_OTP: 'Invalid or expired OTP. Please request a new one and try again.',
  TOKEN_CREATION_FAILED: 'Unable to generate verification token. Please try again.',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable. Please try again later.',
  ACCOUNT_CREATION_FAILED: 'Unable to create account. Please try again.',
  PASSWORD_RESET_FAILED: 'Unable to reset password. Please try again.',
  INVALID_CREDENTIALS: 'Invalid email or password. Please check your credentials and try again.',
  INVALID_TOKEN: 'Invalid or expired verification. Please request a new OTP.',
  PROCESS_SIGNIN_FAILED_AFTER_REGISTRATION:
    'Registration completed but sign-in failed. Please try signing in manually.',
  PROCESS_SIGNIN_FAILED_AFTER_RESET:
    'Password reset completed but sign-in failed. Please try signing in manually.',
  PROCESS_SIGNIN_FAILED_AFTER_SIGNIN: 'Sign-in failed. Please try signing in again.',
} as const;

// Constants for success messages
const SUCCESS_MESSAGES = {
  REGISTER_OTP:
    'If this email is not already registered, you will receive an OTP within 2-3 minutes.',
  RESET_OTP:
    'If this email is registered with us, you will receive a password reset OTP within 2-3 minutes.',
  ACCOUNT_CREATED: 'Account created successfully! Welcome aboard.',
  PASSWORD_RESET: 'Password reset successfully. You can now sign in with your new password.',
  SIGNIN_SUCCESS: 'Welcome back! You have been signed in successfully.',
  OTP_VERIFIED: 'OTP verified successfully.',
} as const;

// Constants for default values
const DEFAULT_VALUES = {
  EMPTY_STRING: '',
  VERIFY_TYPE: 'verify' as const,
} as const;

/**
 * Authentication Controller
 */
export class AuthController {
  // ==========================================
  // REGISTRATION FLOW
  // ==========================================

  /**
   * Send OTP for user registration
   */
  static async sendRegisterOtp(
    req: Request<Record<string, never>, ApiResponseType, SendOtpRequest>,
    res: Response<ApiResponseType>,
    next: NextFunction,
  ): Promise<void> {
    const log = new LoggerWrapper(req);
    try {
      const { email } = await AuthValidation.register.sendOtpSchema.validateAsync(req.body);
      log.logUserAction('Registration OTP request', email);

      const account = await AuthService.findUserByEmail(email);
      const isAccountExists = !!account;

      if (isAccountExists) {
        log.logUserAction('OTP requested for existing account', email);
        return ApiResponse.delayedSuccess(res, SUCCESS_MESSAGES.REGISTER_OTP);
      }

      await AuthService.sendOtp(email);

      log.logUserAction('OTP sent successfully', email);
      return ApiResponse.success(res, SUCCESS_MESSAGES.REGISTER_OTP);
    } catch (error: unknown) {
      log.error('Registration OTP request failed', error);
      return next(error);
    }
  }

  /**
   * Verify OTP for user registration
   */
  static async verifyRegisterOtp(
    req: Request<Record<string, never>, ApiResponseType, VerifyOtpRequest>,
    res: Response<ApiResponseType>,
    next: NextFunction,
  ): Promise<void> {
    const log = new LoggerWrapper(req);
    try {
      const { email, otp } = await AuthValidation.register.verifyOtpSchema.validateAsync(req.body);
      log.logUserAction('Registration OTP verification attempt', email);

      const otpValidationResult = await AuthService.validateOtp(email, otp);
      if (!otpValidationResult.valid) {
        log.logUserAction('Invalid OTP for registration', email);
        return next(createErr.BadRequest(ERROR_MESSAGES.INVALID_OTP));
      }

      const verificationTokenResult = AuthService.createVerificationToken(email, 'register');
      if (!verificationTokenResult.success) {
        log.logUserError('Token creation failed for registration', email);
        return next(createErr.InternalServerError(ERROR_MESSAGES.TOKEN_CREATION_FAILED));
      }

      log.logUserAction('Registration OTP verified successfully', email);
      return ApiResponse.success(res, SUCCESS_MESSAGES.OTP_VERIFIED, {
        verifyToken: verificationTokenResult.token,
      });
    } catch (error: unknown) {
      log.error('Registration OTP verification error', error);
      return next(error);
    }
  }

  /**
   * Complete user registration with password
   */
  static async completeRegistration(
    req: Request<Record<string, never>, ApiResponseType, CompleteRequest>,
    res: Response<ApiResponseType>,
    next: NextFunction,
  ): Promise<void> {
    const log = new LoggerWrapper(req);
    try {
      const { password, token } = await AuthValidation.register.complete.validateAsync(req.body);
      const verifiedTokenData = await AuthController.verifyTokenAndPurpose(token, 'register', log);

      const { email } = verifiedTokenData;
      log.logUserAction('Completing registration', email);

      const hashedPassword = await AuthService.hashPassword(password);
      if (!hashedPassword) {
        log.logUserError('Password hashing failed', email);
        return next(createErr.ServiceUnavailable(ERROR_MESSAGES.SERVICE_UNAVAILABLE));
      }

      const createdAccount = await AuthService.createAccount(email, hashedPassword);
      if (!createdAccount) {
        log.logUserError('Account creation failed', email);
        return next(createErr.InternalServerError(ERROR_MESSAGES.ACCOUNT_CREATION_FAILED));
      }

      const userInfo = await processSignIn(
        req,
        res,
        email,
        email,
        DEFAULT_VALUES.EMPTY_STRING,
        DEFAULT_VALUES.EMPTY_STRING,
      );
      if (!userInfo) {
        log.logUserError('Sign-in process failed after registration', email);
        return next(
          createErr.InternalServerError(ERROR_MESSAGES.PROCESS_SIGNIN_FAILED_AFTER_REGISTRATION),
        );
      }

      log.logUserAction('Registration completed successfully', email);
      return ApiResponse.success(res, SUCCESS_MESSAGES.ACCOUNT_CREATED, { userInfo });
    } catch (error: unknown) {
      log.error('Registration completion error', error);
      return next(error);
    }
  }

  // ==========================================
  // PASSWORD RESET FLOW
  // ==========================================

  /**
   * Send OTP for password reset
   */
  static async sendResetOtp(
    req: Request<Record<string, never>, ApiResponseType, SendOtpRequest>,
    res: Response<ApiResponseType>,
    next: NextFunction,
  ): Promise<void> {
    const log = new LoggerWrapper(req);
    try {
      const { email } = await AuthValidation.reset.sendOtpSchema.validateAsync(req.body);
      log.logUserAction('Password reset OTP request', email);

      const account = await AuthService.findUser(email);
      const isAccountExists = !!account;

      if (!isAccountExists) {
        log.logUserAction('OTP requested for non-existing account', email);
        return ApiResponse.delayedSuccess(res, SUCCESS_MESSAGES.RESET_OTP);
      }

      await AuthService.sendOtp(email);

      log.logUserAction('OTP sent successfully', email);
      return ApiResponse.success(res, SUCCESS_MESSAGES.RESET_OTP);
    } catch (error: unknown) {
      log.error('Password reset OTP request failed', error);
      return next(error);
    }
  }

  /**
   * Verify OTP for password reset
   */
  static async verifyResetOtp(
    req: Request<Record<string, never>, ApiResponseType, VerifyOtpRequest>,
    res: Response<ApiResponseType>,
    next: NextFunction,
  ): Promise<void> {
    const log = new LoggerWrapper(req);
    try {
      const { email, otp } = await AuthValidation.reset.verifyOtpSchema.validateAsync(req.body);
      log.logUserAction('Password reset OTP verification attempt', email);

      const otpValidationResult = await AuthService.validateOtp(email, otp);
      if (!otpValidationResult.valid) {
        log.logUserAction('Invalid OTP for password reset', email);
        return next(createErr.BadRequest(ERROR_MESSAGES.INVALID_OTP));
      }

      const verificationTokenResult = AuthService.createVerificationToken(email, 'reset');
      if (!verificationTokenResult.success) {
        log.logUserError('Token creation failed for password reset', email);
        return next(createErr.InternalServerError(ERROR_MESSAGES.TOKEN_CREATION_FAILED));
      }

      log.logUserAction('Password reset OTP verified successfully', email);
      return ApiResponse.success(res, SUCCESS_MESSAGES.OTP_VERIFIED, {
        verifyToken: verificationTokenResult.token,
      });
    } catch (error: unknown) {
      log.error('Password reset OTP verification error', error);
      return next(error);
    }
  }

  /**
   * Complete password reset
   */
  static async completeReset(
    req: Request<Record<string, never>, ApiResponseType, CompleteRequest>,
    res: Response<ApiResponseType>,
    next: NextFunction,
  ): Promise<void> {
    const log = new LoggerWrapper(req);
    try {
      const { password, token } = await AuthValidation.reset.complete.validateAsync(req.body);
      const verifiedTokenData = await AuthController.verifyTokenAndPurpose(token, 'reset', log);

      const { email } = verifiedTokenData;
      log.logUserAction('Completing password reset', email);

      const hashedPassword = await AuthService.hashPassword(password);
      if (!hashedPassword) {
        log.logUserError('Password hashing failed for reset', email);
        return next(createErr.ServiceUnavailable(ERROR_MESSAGES.SERVICE_UNAVAILABLE));
      }

      const passwordResetResult = await AuthService.resetPassword(email, hashedPassword);
      if (!passwordResetResult) {
        log.logUserError('Password reset failed', email);
        return next(createErr.InternalServerError(ERROR_MESSAGES.PASSWORD_RESET_FAILED));
      }

      const userInfo = await processSignIn(
        req,
        res,
        email,
        passwordResetResult.uname,
        passwordResetResult.name,
        passwordResetResult.img,
      );

      if (!userInfo) {
        log.logUserError('Sign-in process failed after password reset', email);
        return next(
          createErr.InternalServerError(ERROR_MESSAGES.PROCESS_SIGNIN_FAILED_AFTER_RESET),
        );
      }

      log.logUserAction('Password reset completed successfully', email);
      return ApiResponse.success(res, SUCCESS_MESSAGES.PASSWORD_RESET, { userInfo });
    } catch (error: unknown) {
      log.error('Password reset completion error', error);
      return next(error);
    }
  }

  // ==========================================
  // SIGNIN FLOW
  // ==========================================

  /**
   * User signin
   */
  static async signin(
    req: Request<Record<string, never>, ApiResponseType, SigninRequest>,
    res: Response<ApiResponseType>,
    next: NextFunction,
  ): Promise<void> {
    const log = new LoggerWrapper(req);
    try {
      const availableUserInfo = isUserLogged(req, 1);
      if (availableUserInfo) {
        return ApiResponse.success(res, SUCCESS_MESSAGES.SIGNIN_SUCCESS, {
          userInfo: availableUserInfo,
        });
      }

      const { email: identifier, password } = await AuthValidation.signin.validateAsync(req.body);
      log.logUserAction('Signin attempt', identifier);

      const foundUser = await AuthService.findUser(identifier);
      if (!foundUser) {
        log.logUserAction('User not found during signin', identifier);
        return next(createErr.Unauthorized(ERROR_MESSAGES.INVALID_CREDENTIALS));
      }

      if (!foundUser.password) {
        log.logUserError('User account has no password set', foundUser.email);
        return next(createErr.InternalServerError(ERROR_MESSAGES.SERVICE_UNAVAILABLE));
      }

      const passwordValidationResult = await AuthService.comparePassword(
        password,
        foundUser.password,
      );
      if (!passwordValidationResult) {
        log.logUserAction('Invalid password during signin', foundUser.email);
        return next(createErr.Unauthorized(ERROR_MESSAGES.INVALID_CREDENTIALS));
      }

      const userInfo = await processSignIn(
        req,
        res,
        foundUser.email,
        foundUser.uname,
        foundUser.name,
        foundUser.img,
      );

      if (!userInfo) {
        log.logUserError('Sign-in process failed after password check', foundUser.email);
        return next(
          createErr.InternalServerError(ERROR_MESSAGES.PROCESS_SIGNIN_FAILED_AFTER_SIGNIN),
        );
      }

      log.logUserAction('Signin successful', foundUser.email);
      return ApiResponse.success(res, SUCCESS_MESSAGES.SIGNIN_SUCCESS, { userInfo });
    } catch (error: unknown) {
      log.error('Signin error', error);
      return next(error);
    }
  }

  // ==========================================
  // USER INFO FLOW
  // ==========================================

  /**
   * Get current user info
   */
  static async me(req: Request, res: Response<ApiResponseType>, next: NextFunction): Promise<void> {
    const log = new LoggerWrapper(req);
    try {
      const userInfo = isUserLogged(req, 1);
      if (!userInfo) {
        return next(createErr.Unauthorized('Authentication required'));
      }

      log.logUserAction('User info retrieved', userInfo.email);
      return ApiResponse.success(res, 'User info retrieved successfully', { userInfo });
    } catch (error: unknown) {
      log.error('User info retrieval error', error);
      return next(error);
    }
  }

  // ==========================================
  // SIGNOUT FLOW
  // ==========================================

  /**
   * User signout
   */
  static async signout(
    req: Request,
    res: Response<ApiResponseType>,
    next: NextFunction,
  ): Promise<void> {
    const log = new LoggerWrapper(req);
    try {
      const email = req.session?.email;
      if (email) {
        log.logUserAction('Signout initiated', email);
      }

      // Clear all cookies
      const clearCookies = (cookies: Record<string, unknown>) => {
        for (const key in cookies) {
          if (key !== '_csrf' && Object.hasOwnProperty.call(cookies, key)) {
            res.clearCookie(key);
          }
        }
      };

      clearCookies(req.cookies || {});
      clearCookies(req.signedCookies || {});

      // Destroy session
      req.session.destroy((error?: Error) => {
        if (error) {
          log.error('Session destruction failed during signout', error);
          return next(createErr.InternalServerError('Signout failed'));
        }

        if (email) {
          log.logUserAction('Signout completed successfully', email);
        }
        return ApiResponse.success(res, 'Signed out successfully');
      });
    } catch (error: unknown) {
      log.error('Signout error', error);
      return next(error);
    }
  }

  // ==========================================
  // PRIVATE HELPER METHODS
  // ==========================================

  /**
   * Verify token payload and purpose (register | reset)
   * Returns { email } on success, or throws error on failure
   */
  private static async verifyTokenAndPurpose(
    token: string,
    expectedPurpose: 'register' | 'reset',
    log: LoggerWrapper,
  ): Promise<{ email: string }> {
    try {
      const tokenVerificationResult = AuthService.verifyToken(token);

      if (!tokenVerificationResult.success || !tokenVerificationResult.payload) {
        log.warn('Token verification failed');
        throw createErr.Unauthorized(ERROR_MESSAGES.INVALID_TOKEN);
      }

      const tokenPayload = tokenVerificationResult.payload;

      if (!AuthController.isVerificationTokenPayload(tokenPayload)) {
        log.warn('Invalid token payload structure');
        throw createErr.Unauthorized(ERROR_MESSAGES.INVALID_TOKEN);
      }

      const isTokenPurposeValid =
        tokenPayload.type === DEFAULT_VALUES.VERIFY_TYPE &&
        tokenPayload.purpose === expectedPurpose;
      if (!isTokenPurposeValid) {
        log.warn('Token purpose mismatch', {
          expected: expectedPurpose,
          actual: tokenPayload.purpose,
        });
        throw createErr.Unauthorized(ERROR_MESSAGES.INVALID_TOKEN);
      }

      log.info('Token verified successfully', { purpose: tokenPayload.purpose });
      return { email: tokenPayload.email };
    } catch (error: unknown) {
      if (createErr.isHttpError(error)) {
        throw error;
      }
      log.error('Token verification error', error);
      throw createErr.Unauthorized(ERROR_MESSAGES.INVALID_TOKEN);
    }
  }

  private static isVerificationTokenPayload(payload: unknown): payload is VerificationTokenPayload {
    if (
      typeof payload === 'object' &&
      payload !== null &&
      'email' in payload &&
      'type' in payload &&
      'purpose' in payload
    ) {
      const payloadRecord = payload as Record<string, unknown>;
      return (
        typeof payloadRecord.email === 'string' &&
        payloadRecord.email.length > 0 &&
        payloadRecord.type === DEFAULT_VALUES.VERIFY_TYPE &&
        typeof payloadRecord.purpose === 'string' &&
        (payloadRecord.purpose === 'register' || payloadRecord.purpose === 'reset')
      );
    }
    return false;
  }
}
