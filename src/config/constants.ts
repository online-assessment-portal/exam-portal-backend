const appEnv: string | undefined = process.env.NODE_ENV;
const isDev: boolean = appEnv === 'DEV';
const isProd: boolean = appEnv === 'PROD';

// OTP Configuration
const OTP_CONFIG: {
  readonly LENGTH: number;
  readonly TTL: number;
  readonly MAX_ATTEMPTS: number;
  readonly RATE_LIMIT_WINDOW: number;
} = {
  LENGTH: 6, // Number of digits in OTP
  TTL: 600, // Time to live in seconds (10 minutes)
  MAX_ATTEMPTS: 5, // Maximum verification attempts per IP
  RATE_LIMIT_WINDOW: 900, // Rate limit window in seconds (15 minutes)
} as const;

const DEFAULT_PROFILE_IMAGE = 'https://i.ibb.co/QpJYCQ7/UL8Ijh0w.png';

export { appEnv, isDev, isProd, OTP_CONFIG, DEFAULT_PROFILE_IMAGE };
