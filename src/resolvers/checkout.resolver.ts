import { Config } from '../config';
import { Resolver, Query, Arg, Mutation } from 'type-graphql';
import { Checkout } from '../models/Checkout';
import { CheckoutService } from '../services/checkout';
import { CheckoutInputType } from '../types/checkout-input.type';
import { CheckoutType } from '../types/checkout.type';
import { TipType } from '../types/tip.type';
import { log } from '../utils';

const checkoutService = CheckoutService.getInstance()
@Resolver()
export class CheckoutResolver {
  @Query(() => [CheckoutType])
  async checkouts() {
    return await Checkout.findAll();
  }

  @Query(() => CheckoutType)
  async checkout(@Arg('id') id: number) {
    return await Checkout.findByPk(id);
  }

  @Mutation(() => CheckoutType)
  async createCheckout(
    @Arg('data') data: CheckoutInputType,
  ) {
    log.info({
      func: 'createCheckout',
      data
    })

    const checkout = await Checkout.create(data);

    checkoutService.processCheckout(checkout)

    return checkout
  }
}
