import { Checkout as CheckoutSdk } from 'checkout-sdk-node';
import { Config } from '../config';
import { Checkout } from '../models/Checkout';

const cko = new CheckoutSdk(Config.checkoutSecureKey, {
  pk: Config.checkoutPublicKey,
  environment: Config.isProduction ? "production" : "sandbox"
});

export class CheckoutService {
  static getInstance() {
    return new CheckoutService()
  }

  async charge(checkout: Checkout) {
    try {
      const res = await cko.payments.request({
        source: {
          type: 'token',
          token: checkout.checkoutTokenId,
          billing_address: {
            address_line1: checkout.streetAddress,
            address_line2: checkout.streetAddress2,
            city: checkout.city,
            state: checkout.state,
            zip: checkout.zip,
            country: checkout.zip,
          },
        },
        currency: checkout.chargeAmountMoney.getCurrency(),
        amount: checkout.chargeAmountMoney.getAmount(),
        payment_type: 'Regular',
        reference: `ORDER ${checkout.id}`,
        description: `Purchase for ${checkout.amount} USDC`,
        processing_channel_id: Config.checkoutProcessingChannelId,
        customer: {
          email: checkout.email,
          name: checkout.fullName,
        },
        metadata: {
          value: `Purchase for ${checkout.amount} USDC`,
        },
      })
      console.log(res)

    } catch (err) {
      console.log(err)
    }
    
  }
}