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
  }
}