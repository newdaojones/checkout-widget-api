import { Resolver, Query, Arg, Mutation, Authorized } from 'type-graphql';
import { CheckoutType } from '../types/checkout.type';
import { log } from '../utils';
import { CheckoutRequest } from '../models/CheckoutRequest';
import { CheckoutRequestType } from '../types/checkoutRequest.type';
import { CheckoutRequestInputType } from '../types/checkoutRequest-input.type';
import { PaidStatus } from '../types/paidStatus.type';

@Resolver()
export class CheckoutRequestResolver {
  @Query(() => CheckoutRequestType)
  async checkoutRequest(@Arg('id') id: string) {
    const checkoutRequest =  await CheckoutRequest.findByPk(id);

    if (!checkoutRequest) {
      throw new Error(`Not found checkout request for ${id}`)
    }

    if (checkoutRequest.status !== PaidStatus.Pending) {
      throw new Error(`Checkout request is on ${checkoutRequest.status} status`)
    }

    return checkoutRequest
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
