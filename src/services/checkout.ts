import { Checkout as CheckoutSdk } from 'checkout-sdk-node';
import { Checkout } from '../models/Checkout';

const cko = new CheckoutSdk(process.env.CHECKOUT_SECURE_KEY, {
  pk: process.env.CHECKOUT_PUBLIC_KEY,
  scope: ['gateway'], // array of scopes
  environment: process.env.NODE_ENV === 'production' ? "production" : "sandbox"
});

export class CheckoutService {
  getInstance() {
    return new CheckoutService()
  }

  async charge(checkout: Checkout) {
    const res = await cko.payments.request({
      token: checkout.checkoutTokenId,
      billing_address: {
        address_line1: checkout.streetAddress,
				address_line2: checkout.streetAddress2,
				city: checkout.city,
				state: checkout.state,
				zip: checkout.zip,
				country: checkout.zip,
      },
      currency: checkout.chargeAmountMoney.getCurrency(),
		  amount: checkout.chargeAmountMoney.getAmount(),
      payment_type: 'Regular',
      reference: `ORDER ${checkout.id}`,
      description: `Purchase for ${checkout.amount} USDC`,
      customer: {
        email: checkout.email,
        name: checkout.fullName,
      },
      metadata: {
        value: `Purchase for ${checkout.amount} USDC`,
      },
    })

    console.log(res)
  }
}