export const Config = {
  jwtSecret: process.env.JWT_SECRET,
  jwtExpires: 24,
  checkoutPublicKey: process.env.CHECKOUT_PUBLIC_KEY,
  checkoutSecureKey: process.env.CHECKOUT_SECURE_KEY,
  checkoutProcessingChannelId: process.env.CHECKOUT_PROCESSING_CHANNEL_ID,
  bridgeApiKey: process.env.BRIDGE_API_KEY,
  bridgeApiURI: process.env.BRIDGE_API_URI,
  isProduction: process.env.NODE_ENV === 'production',
  isStaging: process.env.NODE_ENV === 'staging',
  frontendUri: process.env.FRONT_END_URI || 'https://test.checkout.mybackpack.app',
  uri: process.env.URI || 'https://test.checkout.mybackpack.app/api',
  defaultFee: {
    fee: 6,
    feeType: 'percent'
  },
  web3: {
    providerUri: process.env.ALCHEMY_URI,
    usdcContractAddress: process.env.USDC_CONTRACT_ADDRESS,
    usdcPoolPrivateKey: process.env.USDC_POOL_PRIVATE_KEY,
    explorerUri: process.env.EXPLORER_URI
  },
  redis: {
    port: Number(process.env.REDIS_PORT),
    host: process.env.REDIS_HOST,
    password: process.env.REDIS_PASSWORD,

    // @ts-ignore
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    reconnectOnError: (err: any) => {
      // https://github.com/luin/ioredis#reconnect-on-error
      if (err && err.message && err.message.includes('READONLY')) {
        return true;
      }

      return false;
    },
  },
}