import axios from 'axios';

// Config
import { Config } from '../config';

import { exponentialBackOff } from '../utils/exponentialBackoff';
import { redisCache } from '../utils/redisCache';
import { log } from './log';

export const getUSDCRate = async () => {
  try {
    const getCoinRateFunc = async () => {
      const getCoingeckoFunc = async () => axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=USD`);
      const { result: response } = await exponentialBackOff(getCoingeckoFunc);

      log.info({
        func: 'getCoinRateFunc',
        data: response.data
      }, 'Got USDC PRICE')

      return response.data['usd-coin'].usd || 1;
    };

    // coingecko API call rate limit: 10-30 requests a minute
    const price = await redisCache(getCoinRateFunc, '__cache__getCoinRate', 30);

    return price
  } catch (err) {
    log.info({
      func: 'getCoinRateFunc',
      err
    }, 'Failed Get USDC PRICE')

    return 1
  }
};
