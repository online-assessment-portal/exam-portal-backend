export interface SendOtpRequest {
  email: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface CompleteRequest {
  password: string;
  token: string;
}

export interface SigninRequest {
  email: string; // Can be email or username
  password: string;
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
  verifyToken?: string;
}

export interface TokenPayload {
  email: string;
  purpose: 'register' | 'reset';
  type: 'verify';
}

export interface AccountLockout {
  attempts: number;
  lockedUntil?: Date;
}
