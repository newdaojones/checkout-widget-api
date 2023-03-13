import * as AsyncLock from 'async-lock';

let lock: AsyncLock;

export const asyncLock = <T>(resource: string | string[], funcPromise: () => Promise<T>): Promise<T> => {
  if (!lock) {
    lock = new AsyncLock({ maxPending: 1000 });
  }

  return lock.acquire(resource, funcPromise);
};
