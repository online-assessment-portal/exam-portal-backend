import { Request } from 'express';

const getClientIP = (req: Request): string => {
  // Check x-forwarded-for (most common proxy header)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ip = (
      Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor
    ) as string;
    const firstIP = (ip.split(',')[0] ?? '').trim();
    if (firstIP != '') {
      return firstIP;
    }
  }

  // Check x-real-ip (alternative proxy header)
  const realIP = req.headers['x-real-ip'];
  if (realIP && typeof realIP === 'string') {
    return realIP.trim();
  }

  // Fallback to Express req.ip or socket address
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
};

export default getClientIP;
