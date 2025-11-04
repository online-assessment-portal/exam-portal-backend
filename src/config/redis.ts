import Redis from 'ioredis';

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: 3,
  lazyConnect: true,
};

let client: Redis | null = null;

export const createRedisClient = (): Redis => {
  if (!client) {
    client = new Redis(redisConfig);
    client.on('error', (err: Error) => console.error('Redis error:', err.message));
  }
  return client;
};

export const getRedisClient = (): Redis => {
  if (!client) {
    throw new Error('Redis client not initialized');
  }
  return client;
};

export const closeRedisClient = (): void => {
  if (client) {
    client.disconnect();
    client = null;
  }
};
