import { redisConnect, redisGetAsync } from '../services/redisClient';
import { sleep } from '../utils/';

export const redisCache = async <T>(funcPromise: () => Promise<T>, redisCacheKey: string, ttl = 5) => {
  const cachedResponseString = await redisGetAsync(redisCacheKey);
  const cachedResponse = cachedResponseString && JSON.parse(cachedResponseString);
  if (cachedResponse) {
    return cachedResponse as T;
  }

  const redisClient = redisConnect();
  let response: T;

  try {
    response = await funcPromise();
  } catch (err) {
    await sleep(ttl * 1000);
    throw err;
  }

  redisClient.set(redisCacheKey, JSON.stringify(response), 'EX', ttl);

  return response;
};
