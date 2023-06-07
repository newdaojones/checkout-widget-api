import * as moment from 'moment-timezone'
import { Resolver, Query, Arg, Mutation, Subscription, Root, Ctx } from 'type-graphql';
import { Checkout } from '../models/Checkout';
import { CheckoutService } from '../services/checkout';
import { CheckoutInputType } from '../types/checkout-input.type';
import { CheckoutType } from '../types/checkout.type';
import { log } from '../utils';
import { TransactionType } from '../types/transaction.type';
import { NotificationType } from '../services/notificationService';
import { Config } from '../config';

const checkoutService = CheckoutService.getInstance()

@Resolver()
export class CheckoutResolver {
  @Query(() => [CheckoutType])
  async checkouts() {
    return await Checkout.findAll();
  }

  @Query(() => CheckoutType)
  async checkout(@Arg('id') id: string) {
    const checkout = await Checkout.findByPk(id);

    if (!checkout) {
      throw new Error(`Not found checkout for ${id}`)
    }

    const transaction = await checkoutService.getCheckoutStatus(checkout)

    return {
      ...checkout.toJSON(),
      transaction
    }
  }

  @Mutation(() => CheckoutType)
  async createCheckoutWithoutUser(
    @Arg('data') data: CheckoutInputType,
  ) {
    log.info({
      func: 'createCheckout',
      data
    })

    const totalAmount = data.amount + data.amount * (data.tip || 0) / 100

    if (totalAmount >= 500) {
      throw new Error('Required user registration for purchasing over $500')
    }
    return checkoutService.process(data, Config.primeTrustAccountId);
  }

  @Mutation(() => CheckoutType)
  async createCheckout(
    @Ctx('user') user: any,
    @Arg('data') data: CheckoutInputType,
  ) {
    log.info({
      func: 'createCheckout',
      data
    })

    return checkoutService.process(data, user.id);
  }

  @Subscription({
    topics: NotificationType.TRANSACTION_STATUS,
    filter: ({ payload, args }) => {
      return !!payload && payload.checkoutId === args.checkoutId;
    }
  })

  transaction(
    @Root() messagePayload: TransactionType,
    @Arg('checkoutId') checkoutId: string,
  ): TransactionType {
    return messagePayload;
  }
}
