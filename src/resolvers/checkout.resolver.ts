import * as moment from 'moment-timezone'
import { Resolver, Query, Arg, Mutation, Subscription, Root } from 'type-graphql';
import { Checkout } from '../models/Checkout';
import { CheckoutService } from '../services/checkout';
import { CheckoutInputType } from '../types/checkout-input.type';
import { CheckoutType } from '../types/checkout.type';
import { log } from '../utils';
import { TransactionType } from '../types/transaction.type';
import { CheckoutRequest } from '../models/CheckoutRequest';

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

    if (data.checkoutRequestId) {
      const checkoutRequest = await CheckoutRequest.findByPk(data.checkoutRequestId);

      if (!checkoutRequest) {
        throw new Error('Can\'t find checkout request');
      }

      if (checkoutRequest.walletAddress !== data.walletAddress) {
        throw new Error('Mismatch wallet address')
      }

      if (checkoutRequest.phoneNumber !== data.phoneNumber) {
        throw new Error('Mismatch phone number')
      }

      if (checkoutRequest.phoneNumber && checkoutRequest.email !== data.email) {
        throw new Error('Mismatch email address')
      }

      if (checkoutRequest.amount !== data.amount) {
        throw new Error('Mismatch amount')
      }
    }

    const totalAmount = data.amount + data.amount * (data.tip || 0) / 100

    if (data.amount >= 500) {
      if (!data.taxId) {
        throw new Error('Required tax ID')
      }

      if (!data.dob) {
        throw new Error('Required date of birth')
      }

      if (!moment.utc(data.dob).isValid()) {
        throw new Error('Invalid date of birth')
      }

      if (!data.gender) {
        throw new Error('Required gender')
      }

      if (!data.documentId) {
        throw new Error('Required KYC document')
      }
    }

    if (totalAmount >= 500) {
     return checkoutService.processWithCustodial(data)
    } else {
      return checkoutService.processAlone(data);
    }
  }

  @Subscription({
    topics: 'TRANSACTION_STATUS',
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
