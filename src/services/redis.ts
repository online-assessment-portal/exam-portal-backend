import { getRedisClient } from '../config/redis';
import Redis from 'ioredis';
import { logger } from '../utils';

export const redisService = {
  async set(key: string, value: string, ttl: number | null = null): Promise<boolean> {
    try {
      const client = getRedisClient();
      if (ttl) {
        return (await client.setex(key, ttl, value)) === 'OK';
      }
      return (await client.set(key, value)) === 'OK';
    } catch (error: unknown) {
      logger.error('Redis set operation failed', { key, error });
      return false;
    }
  },

  async get(key: string): Promise<string | null> {
    try {
      const client = getRedisClient();
      return await client.get(key);
    } catch (error: unknown) {
      logger.error('Redis get operation failed', { key, error });
      return null;
    }
  },

  async delete(key: string): Promise<boolean> {
    try {
      const client = getRedisClient();
      return (await client.del(key)) > 0;
    } catch (error: unknown) {
      logger.error('Redis delete operation failed', { key, error });
      return false;
    }
  },

  getClient(): Redis {
    return getRedisClient();
  },
};
