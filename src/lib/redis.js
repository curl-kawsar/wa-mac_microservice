import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

if (!REDIS_URL) {
  throw new Error('Please define the REDIS_URL environment variable inside .env.local');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.redis;

if (!cached) {
  cached = global.redis = { conn: null, promise: null };
}

async function getRedisConnection() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = new Promise((resolve, reject) => {
      const redis = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        lazyConnect: true,
      });

      redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
        resolve(redis);
      });

      redis.on('error', (error) => {
        console.error('❌ Redis connection error:', error);
        reject(error);
      });

      // Attempt to connect
      redis.connect().catch(reject);
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default getRedisConnection;
