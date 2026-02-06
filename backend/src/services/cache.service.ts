import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Redis connected successfully');
});

export const cacheService = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  },

  async set(key: string, value: any, ttlSeconds = 60): Promise<void> {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      console.error(`Error setting cache key ${key}:`, error);
    }
  },

  async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error(`Error deleting cache key ${key}:`, error);
    }
  },

  async incr(key: string, ttlSeconds = 60): Promise<number> {
    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, ttlSeconds);
      }
      return count;
    } catch (error) {
      console.error(`Error incrementing cache key ${key}:`, error);
      return 0;
    }
  },

  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Error checking existence of key ${key}:`, error);
      return false;
    }
  },

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const data = await redis.mget(...keys);
      return data.map((item) => (item ? JSON.parse(item) : null));
    } catch (error) {
      console.error('Error getting multiple cache keys:', error);
      return keys.map(() => null);
    }
  },

  async mset(entries: Record<string, any>, ttlSeconds = 60): Promise<void> {
    try {
      const pipeline = redis.pipeline();
      for (const [key, value] of Object.entries(entries)) {
        pipeline.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      }
      await pipeline.exec();
    } catch (error) {
      console.error('Error setting multiple cache keys:', error);
    }
  },

  async flush(): Promise<void> {
    try {
      await redis.flushdb();
    } catch (error) {
      console.error('Error flushing cache:', error);
    }
  },

  async disconnect(): Promise<void> {
    try {
      await redis.quit();
    } catch (error) {
      console.error('Error disconnecting from Redis:', error);
    }
  },
};
