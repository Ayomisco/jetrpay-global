import { createClient, RedisClientType } from 'redis';
import { logger } from '@/utils/logger';

const redis: RedisClientType = createClient({ url: process.env.REDIS_URL }) as RedisClientType;

redis.on('error', (err) => logger.error({ message: 'Redis client error', err }));

export async function connectRedis(): Promise<void> {
  if (!redis.isOpen) {
    await redis.connect();
    logger.info('Redis connected');
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redis.isOpen) {
    await redis.disconnect();
  }
}

export default redis;
