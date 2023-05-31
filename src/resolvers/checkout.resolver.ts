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
import { CheckoutStep } from '../types/checkoutStep.type';
import { PaidStatus } from '../types/paidStatus.type';

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
    const transaction: TransactionType = {
      checkoutId: checkout.id,
      step: CheckoutStep.Charge,
      status: checkout.status === PaidStatus.Paid ? 'settled' : checkout.status === PaidStatus.Error ? 'failed' : checkout.status,
      paidStatus: checkout.status,
      message: '',
      transactionId: null,
      date: new Date()
    }


    const charge = await checkout.getCharge()
    const assetQuote = await checkout.getAssetQuote()
    const assetTransfer = await checkout.getAssetTransfer()

    if (assetTransfer) {
      transaction.step = CheckoutStep.Asset
    } else if (assetQuote) {
      transaction.step = CheckoutStep.Quote
    } else if (charge) {
      transaction.step = CheckoutStep.Charge
    }

    if (checkout.status === PaidStatus.Paid && assetTransfer) {
      transaction.transactionId = assetTransfer.transactionHash
      transaction.message = 'Settled transfer assets'
    } else if (checkout.status === PaidStatus.Processing) {
      transaction.message = `Processing ${transaction.step}`
    } else if (transaction.paidStatus === PaidStatus.Error) {
      transaction.message = `Failed checkout for ${transaction.step}`
    }

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
