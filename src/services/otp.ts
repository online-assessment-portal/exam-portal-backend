import * as crypto from 'crypto';
import createErr from 'http-errors';
import { redisService } from './redis';
import MailerService from './mailer/mailer.service';
import { OTP_CONFIG } from '../config/constants';
import { logger } from '../utils';

const mailerService = new MailerService();

interface OtpValidationResult {
  valid: boolean;
  expired: boolean;
}

export const otpService = {
  generateOtp(): string {
    const min = Math.pow(10, OTP_CONFIG.LENGTH - 1);
    const max = Math.pow(10, OTP_CONFIG.LENGTH) - 1;
    return crypto.randomInt(min, max + 1).toString();
  },

  async storeOtp(email: string, otp: string): Promise<void> {
    const key = `otp:${email}`;
    const success = await redisService.set(key, otp, OTP_CONFIG.TTL);
    if (!success) {
      logger.error('OTP storage failed', { email, key });
      throw createErr.ServiceUnavailable('Failed to store OTP');
    }
  },

  async validateOtp(email: string, otp: string): Promise<OtpValidationResult> {
    const key = `otp:${email}`;
    const storedOtp = await redisService.get(key);

    if (!storedOtp) {
      return { valid: false, expired: true };
    }

    const isValid = storedOtp === otp.toString();
    if (isValid) {
      await redisService.delete(key);
    }

    return { valid: isValid, expired: false };
  },

  async sendOtp(email: string): Promise<void> {
    const otp = this.generateOtp();
    await this.storeOtp(email, otp);

    const mailResult = await mailerService.sendOTP(email, otp);
    if (!mailResult.success) {
      logger.error('OTP email send failed', {
        email,
        error: mailResult.error,
        errorCode: mailResult.errorCode,
      });
      throw createErr.ServiceUnavailable('Failed to send OTP email');
    }
  },

  async hasOtp(email: string): Promise<boolean> {
    const key = `otp:${email}`;
    const otp = await redisService.get(key);
    return otp !== null;
  },

  async deleteOtp(email: string): Promise<boolean> {
    const key = `otp:${email}`;
    return await redisService.delete(key);
  },
};
