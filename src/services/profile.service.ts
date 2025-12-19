import { credentialsMdl } from '../../helpers/schemaColl';
import { DEFAULT_PROFILE_IMAGE } from '../config/constants';
import { AuthService } from './auth.service';

export interface ProfileUpdateData {
  uname?: string;
  name?: string;
  img?: string;
}

export interface ProfileData {
  email: string;
  uname: string;
  name: string;
  img: string;
}

export class ProfileService {
  static async getProfile(email: string): Promise<ProfileData | null> {
    const user = await AuthService.findUserByEmail(email);
    if (!user) return null;

    return {
      email: user.email,
      uname: user.uname,
      name: user.name,
      img: user.img || DEFAULT_PROFILE_IMAGE,
    };
  }

  static async updateProfile(email: string, data: ProfileUpdateData): Promise<ProfileData | null> {
    try {
      const user = await credentialsMdl.findOneAndUpdate({ email }, data, { new: true });
      if (!user) return null;

      return {
        email: user.email,
        uname: user.uname,
        name: user.name,
        img: user.img || DEFAULT_PROFILE_IMAGE,
      };
    } catch (error) {
      if (this.isMongoDBDuplicateKeyError(error, 'uname')) {
        throw new Error('USERNAME_ALREADY_EXISTS');
      }
      throw error;
    }
  }

  private static isMongoDBDuplicateKeyError(error: unknown, field: string): boolean {
    if (error === null || typeof error !== 'object') return false;
    if (!('code' in error) || error.code !== 11000) return false;
    if (!('keyPattern' in error) || !error.keyPattern) return false;
    if (typeof error.keyPattern !== 'object' || error.keyPattern === null) return false;
    if (!(field in error.keyPattern)) return false;
    return true;
  }
}
