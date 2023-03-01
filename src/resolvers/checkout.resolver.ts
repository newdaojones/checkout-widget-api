import { Resolver, Query, Arg, Mutation } from 'type-graphql';
import { Checkout } from '../models/Checkout';
import { CheckoutInputType } from '../types/checkout-input.type';
import { CheckoutType } from '../types/checkout.type';
import { log } from '../utils';

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
  }
}
