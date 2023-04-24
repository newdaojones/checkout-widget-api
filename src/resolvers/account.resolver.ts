import * as moment from 'moment-timezone'
import { Resolver, Query, Arg, Mutation, Subscription, Root, Authorized } from 'type-graphql';
import { Checkout } from '../models/Checkout';
import { CheckoutService } from '../services/checkout';
import { CheckoutInputType } from '../types/checkout-input.type';
import { CheckoutType } from '../types/checkout.type';
import { log } from '../utils';
import { TransactionType } from '../types/transaction.type';
import { CheckoutRequest } from '../models/CheckoutRequest';

const checkoutService = CheckoutService.getInstance()

@Resolver()
export class CustodialAccountResolver {
  @Query(() => [CheckoutType])
  @Authorized()
  async me() {
    return await Checkout.findAll();
  }

  @Mutation(() => CheckoutType)
  async createAccount(
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
    topics: 'ACCOUNT_STATUS',
    filter: ({ payload, args }) => {
      return !!payload && payload.userId === args.userId;
    }
  })

  user(
    @Root() messagePayload: TransactionType,
    @Arg('userId') userId: string,
  ): TransactionType {
    return messagePayload;
  }
}
