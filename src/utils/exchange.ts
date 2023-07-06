import axios from 'axios';

// Config
import { Config } from '../config';

import { exponentialBackOff } from '../utils/exponentialBackoff';
import { redisCache } from '../utils/redisCache';

export const getUSDCRate = async () => {
  const getCoinRateFunc = async () => {
    const getCoinMarketCappFunc = async () => axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=USD`);
    const { result: response } = await exponentialBackOff(getCoinMarketCappFunc);
    return response.data['usd-coin'].usd || 1;
  };

  // coingecko API call rate limit: 10-30 requests a minute
  return redisCache(getCoinRateFunc, '__cache__getCoinRate', 30);
};
