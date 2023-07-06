import redis from 'redis';

import { Config } from '../config';
import { log } from '../utils';

let redisClient: redis.RedisClient;

export const redisConnect = () => {
  if (!redisClient) {
    redisClient = redis.createClient({
      host: Config.redis.host,
      port: Number(Config.redis.port),
      password: Config.redis.password,
    });

    redisClient.on('connect', () => log.info('Connected to Redis'));
  }

  return redisClient;
};

export const redisGetAsync = (key: string): Promise<string> => new Promise((resolve, reject) => {
  redisConnect().get(key, (err: any, res: string) => {
    if (err) {
      reject(err);
      return;
    }

    resolve(res);
  });
});
