import * as bcrypt from 'bcrypt';
import { jwtService } from '../jwt';
import { otpService } from '../otp';

import { credentialsMdl } from '../../../helpers/schemaColl';

const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');

export class AuthService {
  static async sendOtp(email: string): Promise<void> {
    await otpService.sendOtp(email);
  }

  static async validateOtp(email: string, otp: string): Promise<{ valid: boolean }> {
    return await otpService.validateOtp(email, otp);
  }

  static createVerificationToken(
    email: string,
    purpose: 'register' | 'reset',
  ): { success: boolean; token?: string; error?: string } {
    return jwtService.sign({ email, purpose, type: 'verify' }, '5m');
  }

  static verifyToken(token: string): { success: boolean; payload?: unknown; error?: string } {
    return jwtService.verify(token);
  }

  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, saltRounds);
  }

  static async createAccount(email: string, hashedPassword: string) {
    const accData = { email, uname: email, password: hashedPassword };
    return await credentialsMdl.create(accData);
  }

  static async resetPassword(email: string, hashedPassword: string) {
    return await credentialsMdl.findOneAndUpdate({ email }, { password: hashedPassword });
  }

  static async findUserByEmail(email: string): Promise<boolean> {
    const account = await credentialsMdl.findOne({ email });
    return account;
  }

  static async findUser(identifier: string) {
    const account = await credentialsMdl.findOne({
      $or: [{ uname: identifier }, { email: identifier }],
    });
    return account;
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }
}
