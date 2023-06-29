import { Config } from "../config";

import Container from "typedi";
import { PubSubEngine } from 'graphql-subscriptions';
import bluebird from "bluebird";

import { Charge } from "../models/Charge";
import { Checkout } from "../models/Checkout";

import { CheckoutSdkService } from "./checkoutSdk";

import { log } from "../utils";
import { convertToCharge } from "../utils/convert";

import { PaidStatus } from "../types/paidStatus.type";
import { CheckoutStep } from "../types/checkoutStep.type";
import { CheckoutInputType } from "../types/checkout-input.type";
import { NotificationService } from "./notificationService";
import { CheckoutRequest } from "../models/CheckoutRequest";
import { TipType } from "../types/tip.type";
import { TransactionType } from "../types/transaction.type";

const checkoutSdkService = CheckoutSdkService.getInstance();
const pubsubEngine = Container.get<PubSubEngine>('pubsub');
const notificationService = NotificationService.getInstance();

export class CheckoutService {
  static getInstance() {
    return new CheckoutService(checkoutSdkService, pubsubEngine, notificationService)
  }

  constructor(private checkoutSdk: CheckoutSdkService, private pubSub: PubSubEngine, private notification: NotificationService) { }

  async process(data: CheckoutInputType, userId: string) {
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

    const checkout = await Checkout.create({
      ...data,
      fee: Config.defaultFee.fee,
      feeType: Config.defaultFee.feeType as TipType,
      userId,
    });

    this.processCheckout(checkout)

    return checkout
  }

  private async processCharge(checkout: Checkout) {
    try {
      this.notification.publishTransactionStatus({
        checkoutId: checkout.id,
        step: CheckoutStep.Charge,
        status: 'processing',
        paidStatus: checkout.status,
        message: `Processing charge $${checkout.totalChargeAmountMoney.toUnit()}`,
        transactionId: null,
        date: new Date()
      })

      const charge = await this.checkoutSdk.charge(checkout);
      const chargeData = convertToCharge(charge);
      const chargeRecord = await Charge.create({
        checkoutId: checkout.id,
        ...chargeData
      })

      if (chargeRecord.status !== 'Authorized') {
        throw new Error(`Charge failed: ${chargeRecord.status}`)
      }

      this.notification.publishTransactionStatus({
        checkoutId: checkout.id,
        step: CheckoutStep.Charge,
        status: 'settled',
        paidStatus: checkout.status,
        message: `Charged $${checkout.totalChargeAmountMoney.toUnit()}`,
        transactionId: null,
        date: new Date()
      })
    } catch (err) {
      log.warn({
        func: 'processCharge',
        checkoutId: checkout.id,
        err,
      }, 'Failed processCharge')

      await checkout.update({
        status: PaidStatus.Error
      })

      const checkoutRequest = await checkout?.getCheckoutRequest()
      await checkoutRequest?.update({
        status: PaidStatus.Error
      })

      await checkoutRequest?.sendWebhook()

      this.notification.publishTransactionStatus({
        checkoutId: checkout.id,
        status: 'failed',
        paidStatus: checkout.status,
        step: CheckoutStep.Charge,
        message: `Failed Charge $${checkout.totalChargeAmountMoney.toUnit()}`,
        transactionId: null,
        date: new Date()
      })

      throw err
    }
  }

  async processCheckout(checkout: Checkout) {
    await bluebird.delay(2000)
    const checkoutRequest = await checkout.getCheckoutRequest()

    try {
      await checkout.update({
        status: PaidStatus.Processing
      })


      await checkoutRequest?.update({
        status: PaidStatus.Processing
      })

      await checkoutRequest?.sendWebhook()
      await this.processCharge(checkout);

      await checkout.update({
        status: PaidStatus.Paid
      })

      await checkoutRequest?.update({
        status: PaidStatus.Paid
      })

      this.notification.publishTransactionStatus({
        checkoutId: checkout.id,
        step: CheckoutStep.Charge,
        status: 'charged',
        paidStatus: checkout.status,
        transactionId: '',
        message: `Charged ${checkout.totalChargeAmountMoney.toUnit()}`,
        date: new Date()
      })
    } catch (err) {
      log.warn({
        func: 'processCheckout',
        checkoutId: checkout.id,
        err
      })
    }
  }

  async getCheckoutStatus(checkout: Checkout) {
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

    if (checkout.status === PaidStatus.Paid) {
      transaction.message = `Charged ${checkout.totalChargeAmountMoney.toFormat()}`
    }
    if (checkout.status === PaidStatus.Paid && assetTransfer) {
      transaction.transactionId = assetTransfer?.transactionHash
      transaction.message = 'Settled transfer assets'
    } else if (checkout.status === PaidStatus.Processing) {
      transaction.message = `Processing ${transaction.step}`
    } else if (transaction.paidStatus === PaidStatus.Error) {
      transaction.message = `Failed checkout for ${transaction.step}`
    }

    return transaction
  }
}