import { Arg, Ctx, Mutation, Query, Resolver, Root, Subscription } from 'type-graphql';
import { Checkout } from '../models/Checkout';
import { CheckoutService } from '../services/checkout';
import { NotificationType } from '../services/notificationService';
import { CheckoutInputType } from '../types/checkout-input.type';
import { CheckoutType } from '../types/checkout.type';
import { TransactionType } from '../types/transaction.type';
import { log } from '../utils';

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
    return checkoutService.process(data);
  }

  @Mutation(() => CheckoutType)
  async createCheckout(
    @Ctx('user') user: any,
    @Arg('data') data: CheckoutInputType,
  ) {
    log.info({
      func: 'createCheckout',
      data,
      user
    })

    if (!user.isVerified) {
      throw new Error('Please process KYC before trading')
    }

    return checkoutService.process(data, user);
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
