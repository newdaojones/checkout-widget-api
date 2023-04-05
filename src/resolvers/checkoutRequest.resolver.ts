import { Resolver, Query, Arg, Mutation } from 'type-graphql';
import { CheckoutType } from '../types/checkout.type';
import { log } from '../utils';
import { CheckoutRequest } from '../models/CheckoutRequest';
import { CheckoutRequestType } from '../types/checkoutRequest.type';
import { CheckoutRequestInputType } from '../types/checkoutRequest-input.type';

@Resolver()
export class CheckoutRequestResolver {
  @Query(() => CheckoutRequestType)
  async checkoutRequest(@Arg('id') id: string) {
    return await CheckoutRequest.findByPk(id);
  }

  @Mutation(() => CheckoutType)
  async createCheckoutRequest(
    @Arg('data') data: CheckoutRequestInputType,
  ) {
    log.info({
      func: 'createCheckoutRequest',
      data
    })


    const checkoutRequest = await CheckoutRequest.create(data);

    return checkoutRequest
  }
}
