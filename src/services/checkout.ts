import { Config } from "../config";

import Container from "typedi";
import { PubSubEngine } from 'graphql-subscriptions';

import { AssetQuote } from "../models/AssetQuote";
import { AssetTransfer } from "../models/AssetTransfer";
import { Charge } from "../models/Charge";
import { Checkout } from "../models/Checkout";
import { FundsTransfer } from "../models/FundsTransfer";

import { CheckoutSdkService } from "./checkoutSdk";
import { PrimeTrustService } from "./primeTrust";

import { log } from "../utils";
import { convertToAssetTransfer, convertToCharge, convertToFundsTransfer, convertToQuote } from "../utils/convert";

import { PaidStatus } from "../types/paidStatus.type";
import { CheckoutStep } from "../types/checkoutStep.type";
import { TransactionType } from "../types/transaction.type";

const checkoutSdkService = CheckoutSdkService.getInstance();
const primeTrustService = PrimeTrustService.getInstance();
const pubsubEngine = Container.get<PubSubEngine>('pubsub');

export class CheckoutService {
  static getInstance() {

    return new CheckoutService(checkoutSdkService, primeTrustService, pubsubEngine)
  }

  constructor(private checkoutSdk: CheckoutSdkService, private primeTrust: PrimeTrustService, private pubSub: PubSubEngine) { }

  private async publishNotification(payload: TransactionType) {
    try {
      if (!this.pubSub) {
        throw new Error('Subscription is not initialized')
      }

      this.pubSub.publish('TRANSACTION_STATUS', payload)
    } catch (err) {
      log.warn({
        func: 'publishNotification',
        checkoutId: payload.checkoutId,
        payload,
        err
      })
    }
  }

  private async processCharge(checkout: Checkout) {
    try {
      const charge = await this.checkoutSdk.charge(checkout);
      const chargeData = convertToCharge(charge);
      await Charge.create({
        checkoutId: checkout.id,
        ...chargeData
      })

      this.publishNotification({
        checkoutId: checkout.id,
        status: checkout.status,
        step: CheckoutStep.Charge,
        message: `Charged $${checkout.totalChargeAmountMoney.toUnit()}`,
        transactionId: null
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

      this.publishNotification({
        checkoutId: checkout.id,
        status: checkout.status,
        step: CheckoutStep.Charge,
        message: `Failed Charge $${checkout.totalChargeAmountMoney.toUnit()}`,
        transactionId: null
      })

      throw err
    }
  }

  private async processAssetTransfer(checkout: Checkout, quote: AssetQuote) {
    try {
      const assetTransferMethodRes = await this.primeTrust.createAssetTransferMethod(checkout.walletAddress);
      const assetTransferMethodId = assetTransferMethodRes.data.id

      await checkout.update({
        assetTransferMethodId
      })

      const res = await this.primeTrust.createAssetDisbursements(assetTransferMethodId, quote.unitCount);
      const assetTransferData = res.included.find((item) => item.type === 'asset-transfers')

      if (!assetTransferData) {
        throw new Error('Can not find asset transfer data')
      }

      const assetTransfer = await AssetTransfer.create({
        ...convertToAssetTransfer(assetTransferData),
        checkoutId: checkout.id,
        disbursementAuthorizationId: res.data.id
      })

      if (!Config.isProduction) {
        await this.primeTrust.sandboxSettleAssetTransfer(assetTransfer.id)
      }

      this.publishNotification({
        checkoutId: checkout.id,
        status: checkout.status,
        step: CheckoutStep.Asset,
        message: `Processing transfer assets for ${quote.unitCount} USDC`,
        transactionId: null
      })
    } catch (err) {
      log.warn({
        func: 'processAssetTransfer',
        checkoutId: checkout.id,
        err,
      }, 'Failed processAssetTransfer')

      await checkout.update({
        status: PaidStatus.Error
      })

      this.publishNotification({
        checkoutId: checkout.id,
        status: checkout.status,
        step: CheckoutStep.Asset,
        message: `Failed transfer assets for ${quote.unitCount} USDC}`,
        transactionId: null
      })
    }
  }

  private async processFundsTransfer(checkout: Checkout) {
    try {
      const res = await this.primeTrust.addFundsToAccount(checkout.fundsAmountMoney)

      const fundsTransfer = res.included?.find((item) => item.type === 'funds-transfers')

      if (!fundsTransfer) {
        throw new Error('Cant find funds transfer')
      }

      const fundsTransferData = convertToFundsTransfer(fundsTransfer);

      const fundsTransferRecord = await FundsTransfer.create({
        ...fundsTransferData,
        checkoutId: checkout.id
      })

      if (!Config.isProduction) {
        await this.primeTrust.sandboxSettleFundsTransfer(fundsTransferRecord.id)
      }

      this.publishNotification({
        checkoutId: checkout.id,
        status: checkout.status,
        step: CheckoutStep.Funds,
        message: `Processing funds for $${checkout.fundsAmountMoney.toUnit()}`,
        transactionId: null
      })
    } catch (err) {
      log.warn({
        func: 'processFundsTransfer',
        checkoutId: checkout.id,
        err,
      }, 'Failed processFundsTransfer')

      await checkout.update({
        status: PaidStatus.Error
      })

      this.publishNotification({
        checkoutId: checkout.id,
        status: checkout.status,
        step: CheckoutStep.Funds,
        message: `Failed Processing funds for $${checkout.fundsAmountMoney.toUnit()}`,
        transactionId: null
      })

      throw err
    }
  }

  private async processQuote(checkout: Checkout) {
    try {
      const quotesRes = await this.primeTrust.createQuote(checkout.amountMoney)
      const assetQuote = await AssetQuote.create({
        ...convertToQuote(quotesRes.data),
        checkoutId: checkout.id
      })

      await this.primeTrust.executeQuote(assetQuote.id)

      this.publishNotification({
        checkoutId: checkout.id,
        status: checkout.status,
        step: CheckoutStep.Quote,
        message: `Processing quote asset for $${checkout.amountMoney.toUnit()}`,
        transactionId: null
      })
    } catch (err) {
      log.warn({
        func: 'processQuote',
        checkoutId: checkout.id,
        err,
      }, 'Failed processQuote')

      await checkout.update({
        status: PaidStatus.Error
      })

      this.publishNotification({
        checkoutId: checkout.id,
        status: checkout.status,
        step: CheckoutStep.Quote,
        message: `Failed quote assets $${checkout.fundsAmountMoney.toUnit()}`,
        transactionId: null
      })
    }
  }

  async processCheckout(checkout: Checkout) {
    try {
      await checkout.update({
        status: PaidStatus.Processing
      })

      await this.processCharge(checkout);
      await this.processFundsTransfer(checkout);
    } catch (err) {
      log.warn({
        func: 'processCheckout',
        checkoutId: checkout.id,
        err
      })
    }
  }


  private async fundsTransferUpdateHandler(fundsTransferId: string) {
    let checkout: Checkout;

    try {
      const fundsTransfer = await FundsTransfer.findByPk(fundsTransferId);

      if (!fundsTransfer) {
        return
      }

      checkout = await fundsTransfer.getCheckout()

      const res = await this.primeTrust.getFundsTransfer(fundsTransferId);
      const fundsTransferRes = res.data.find((item) => item.id === fundsTransferId);
      const contingentHoldIds = fundsTransferRes.relationships['contingent-holds']?.data?.map((item) => item.id) || []

      if (!fundsTransferRes) {
        throw new Error(`Cant get funds transfer from prime trust for ${fundsTransferId}`)
      }

      await fundsTransfer.update(convertToFundsTransfer(fundsTransferRes));

      if (fundsTransfer.status !== 'pending' && fundsTransfer.status !== 'settled') {
        throw new Error('Unknown status for funds transfer')
      }

      if (fundsTransfer.status !== 'settled') {
        return
      }

      if (!fundsTransfer.contingenciesClearedAt && !Config.isProduction) { // sandbox only for clear holds
        const contingentHolds = res.included?.filter((item) => item.type === 'contingent-holds' && item.attributes.status === 'pending' && contingentHoldIds.includes(item.id)) || []

        for (const contingentHold of contingentHolds) {
          await this.primeTrust.sandboxClearFundsTransfer(contingentHold.id)
        }

        return
      }

      this.publishNotification({
        checkoutId: checkout.id,
        status: checkout.status,
        step: CheckoutStep.Funds,
        message: `Settled funds $${checkout.fundsAmountMoney.toUnit()}`,
        transactionId: null
      })

      await this.processQuote(checkout)
    } catch (err) {
      log.warn({
        func: 'fundsTransferUpdateHandler',
        fundsTransferId,
        checkoutId: checkout?.id,
        err
      }, 'Failed fundsTransferUpdateHandler')

      if (checkout) {
        await checkout.update({
          status: PaidStatus.Error
        })
  
        this.publishNotification({
          checkoutId: checkout.id,
          status: checkout.status,
          step: CheckoutStep.Funds,
          message: `Failed funds $${checkout.fundsAmountMoney.toUnit()}`,
          transactionId: null
        })
      }

      throw err
    }
  }

  private async quotesUpdateHandler(assetQuoteId: string) {
    let checkout: Checkout;

    try {
      const quote = await AssetQuote.findByPk(assetQuoteId);

      if (!quote) {
        return
      }

      checkout = await quote.getCheckout()
      const res = await this.primeTrust.getQuote(assetQuoteId);

      await quote.update(convertToQuote(res.data));

      if (quote.status !== 'pending' && quote.status !== 'settled') {
        throw new Error('Unknown status for funds transfer')
      }

      if (quote.status !== 'settled') {
        return
      }

      await this.processAssetTransfer(checkout, quote)
    } catch (err) {
      log.warn({
        func: 'quotesUpdateHandler',
        assetQuoteId,
        checkoutId: checkout?.id,
        err
      }, 'Failed quotesUpdateHandler')

      if (checkout) {
        await checkout.update({
          status: PaidStatus.Error
        })
  
        this.publishNotification({
          checkoutId: checkout.id,
          status: checkout.status,
          step: CheckoutStep.Quote,
          message: `Failed quote assets $${checkout.fundsAmountMoney.toUnit()}`,
          transactionId: null
        })
      }

      throw err
    }
  }

  private async assetTransferUpdateHandler(assetTransferId: string) {
    let checkout: Checkout;
    let assetTransfer: AssetTransfer;
    try {
      assetTransfer = await AssetTransfer.findByPk(assetTransferId);

      if (!assetTransfer) {
        return
      }

      const checkout = await assetTransfer.getCheckout()
      const res = await this.primeTrust.getAssetTransfer(assetTransferId);

      await assetTransfer.update(convertToQuote(res.data));

      if (assetTransfer.status !== 'pending' && assetTransfer.status !== 'settled') {
        throw new Error('Unknown status for funds transfer')
      }

      if (assetTransfer.status !== 'settled') {
        return
      }

      await checkout.update({
        status: PaidStatus.Paid
      })

      this.pubSub.publish('TRANSACTION_STATUS', {
        checkoutId: checkout.id,
        step: CheckoutStep.Asset,
        status: checkout.status,
        transactionId: assetTransfer.transactionHash,
        message: `Settled transfer assets for ${Math.abs(assetTransfer.unitCount)} USDC`
      })
    } catch (err) {
      log.warn({
        func: 'assetTransferUpdateHandler',
        assetTransferId,
        checkoutId: checkout?.id,
        err
      }, 'Failed assetTransferUpdateHandler')

      if (checkout) {
        await checkout.update({
          status: PaidStatus.Error
        })

        this.pubSub.publish('TRANSACTION_STATUS', {
          checkoutId: checkout.id,
          step: CheckoutStep.Asset,
          status: checkout.status,
          transactionId: null,
          message: `Failed transfer assets for ${Math.abs(assetTransfer.unitCount)} USDC`
        })
      }

      throw err
    }
  }

  async webhookHandler(data: any) {
    log.info({
      func: 'webhookHandler',
      data
    })

    if (data['account-id'] !== Config.primeTrustAccountId) {
      return
    }

    // if (data.action !== 'update' && data.action !== 'settled') {
    //   return
    // }

    try {
      switch (data['resource-type']) {
        case 'funds_transfers':
          await this.fundsTransferUpdateHandler(data['resource_id'])
        case 'facilitated_trades':
          await this.quotesUpdateHandler(data['resource_id'])
        case 'asset_transfers':
          await this.assetTransferUpdateHandler(data['resource_id'])
        default:
          return
      }
    } catch (err) {
      log.warn({
        func: 'webhookHandler',
        data,
      }, 'Failed webhook handler')
    }
  }
}