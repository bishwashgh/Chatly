import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';

export const PUB_SUB = 'PUB_SUB';

export const pubSubProvider = {
  provide: PUB_SUB,
  useFactory: () => {
    const retryStrategy = (times: number) => Math.min(times * 50, 2000);

    // On Render, Key Value (Redis) gives you a REDIS_URL like:
    //   rediss://red-xxxx:password@oregon-keyvalue.render.com:6379
    // (the internal variant uses redis:// and a .render-internal.com host)
    if (process.env.REDIS_URL) {
      const urlOptions = { maxRetriesPerRequest: null, retryStrategy };
      return new RedisPubSub({
        publisher: new Redis(process.env.REDIS_URL, urlOptions),
        subscriber: new Redis(process.env.REDIS_URL, urlOptions),
      });
    }

    // Fallback: discrete host/port (local dev / docker compose)
    const options = {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      retryStrategy,
    };
    return new RedisPubSub({
      publisher: new Redis(options),
      subscriber: new Redis(options),
    });
  },
};
