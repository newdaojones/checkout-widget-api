export const Config = {
  jwtSecret: process.env.JWT_SECRET,
  jwtExpires: 24,
  checkoutPublicKey: process.env.CHECKOUT_PUBLIC_KEY,
  checkoutSecureKey: process.env.CHECKOUT_SECURE_KEY,
  checkoutProcessingChannelId: process.env.CHECKOUT_PROCESSING_CHANNEL_ID,
  primeTrustAccountEmail: process.env.PRIME_TRUST_ACCOUNT_EMAIL,
  primeTrustAccountPassword: process.env.PRIME_TRUST_ACCOUNT_PASSWORD,
  primeTrustSettlementAccountId: process.env.PRIME_TRUST_SETTLEMENT_CUSTODY_ACCOUNT_ID,
  primeTrustSettlementContactId: process.env.PRIME_TRUST_SETTLEMENT_CUSTODY_CONTACT_ID,
  primeTrustAccountId: process.env.PRIME_TRUST_CUSTODY_ACCOUNT_ID,
  primeTrustContactId: process.env.PRIME_TRUST_CUSTODY_CONTACT_ID,
  primeTrustUsdcAssetId: process.env.PRIME_TRUST_USDC_ASSET_ID,
  primeTrustFundsTransferMethodId: process.env.PRIME_TRUST_FUNDS_TRANSFER_METHOD_ID,
  primeTrustApiUri: process.env.PRIME_TRUST_API_URI,
  isProduction: process.env.NODE_ENV === 'production',
  isStaging: process.env.NODE_ENV === 'staging',
  frontendUri: process.env.FRONT_END_URI || 'https://test.checkout.mybackpack.app/',
  uri: process.env.URI || 'https://test.checkout.mybackpack.app/api',
  defaultFee: {
    fee: 2,
    feeType: 'percent'
  }
}