import express from 'express';
import { AuthController } from '../controllers/auth.controller';
import {
  otpMailRateLimitMiddleware,
  otpVerifyRateLimitMiddleware,
  signinRateLimitMiddleware,
} from '../middleware/rateLimiter';

const router = express.Router();

// Registration Flow
router.post('/register/send-otp', otpMailRateLimitMiddleware, AuthController.sendRegisterOtp);
router.post('/register/verify-otp', otpVerifyRateLimitMiddleware, AuthController.verifyRegisterOtp);
router.post('/register/complete', AuthController.completeRegistration);

// Reset Flow
router.post('/reset/send-otp', otpMailRateLimitMiddleware, AuthController.sendResetOtp);
router.post('/reset/verify-otp', otpVerifyRateLimitMiddleware, AuthController.verifyResetOtp);
router.put('/reset/complete', AuthController.completeReset);

// Signin
router.post('/signin', signinRateLimitMiddleware, AuthController.signin);

export default router;
