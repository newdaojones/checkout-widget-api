import { Config } from "../config";
import { AssetQuote } from "../models/AssetQuote";
import { Charge } from "../models/Charge";
import { Checkout } from "../models/Checkout";
import { FundsTransfer } from "../models/FundsTransfer";
import { PaidStatus } from "../types/paidStatus.type";
import { log } from "../utils";
import { convertToCharge, convertToFundsTransfer, convertToQuote } from "../utils/convert";
import { CheckoutSdkService } from "./checkoutSdk";
import { PrimeTrustService } from "./primeTrust";

const checkoutSdkService = CheckoutSdkService.getInstance();
const primeTrustService = PrimeTrustService.getInstance();

export class CheckoutService {
  static getInstance() {

    return new CheckoutService(checkoutSdkService, primeTrustService)
  }

  constructor (private checkoutSdk: CheckoutSdkService, private primeTrust: PrimeTrustService) {}

  async processCheckout(checkout: Checkout) {
    try {
      await checkout.update({
        status: PaidStatus.Processing
      })

      const charge = await this.checkoutSdk.charge(checkout);
      const chargeData = convertToCharge(charge);
      await Charge.create({
        checkoutId: checkout.id,
        ...chargeData
      })

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
    } catch (err) {
      await checkout.update({
        status: PaidStatus.Error
      })

      log.info({
        func: 'processCheckout',
        checkoutId: checkout.id,
        err
      })
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

    try {
      switch(data['resource-type']) {
        case 'funds_transfers':
          await this.fundsTransferUpdateHandler(data['resource_id'])
        case 'facilitated_trades':
          await this.quotesUpdateHandler(data['resource_id'])
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

  async quotesUpdateHandler(assetQuoteId: string) {
    try {
      const quote = await AssetQuote.findByPk(assetQuoteId);

      if (!quote) {
        return
      }

      const checkout = await quote.getCheckout()

      const res = await this.primeTrust.getQuote(assetQuoteId);
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
      }

      const quotesRes = await this.primeTrust.createQuote(checkout.amountMoney)
      
      const assetQuote = await AssetQuote.create({
        ...convertToQuote(quotesRes),
        checkoutId: checkout.id
      })

      await this.primeTrust.executeQuote(assetQuote.id)
    } catch (err) {
      log.warn({
        func: 'fundsTransferUpdateHandler',
        fundsTransferId,
      }, 'Failed fundsTransferUpdateHandler')
      
      throw err
    }
  }
}