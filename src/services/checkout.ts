import { Config } from "../config";

import Container from "typedi";
import { PubSubEngine } from 'graphql-subscriptions';
import bluebird from "bluebird";

import { AssetQuote } from "../models/AssetQuote";
import { AssetTransfer } from "../models/AssetTransfer";
import { Charge } from "../models/Charge";
import { Checkout } from "../models/Checkout";
import { FundsTransfer } from "../models/FundsTransfer";

import { CheckoutSdkService } from "./checkoutSdk";
import { PrimeTrustService } from "./primeTrust";

import { log } from "../utils";
import { convertToAssetTransfer, convertToCharge, convertToContact, convertToFundsTransfer, convertToQuote } from "../utils/convert";

import { PaidStatus } from "../types/paidStatus.type";
import { CheckoutStep } from "../types/checkoutStep.type";
import { asyncLock } from "../utils/lock";
import { CheckoutInputType } from "../types/checkout-input.type";
import { User } from "../models/User";
import { NotificationService } from "./notificationService";
import { CheckoutRequest } from "../models/CheckoutRequest";
import { UserService } from "./userService";
import { TipType } from "../types/tip.type";
import { TransactionType } from "../types/transaction.type";

const checkoutSdkService = CheckoutSdkService.getInstance();
const primeTrustService = PrimeTrustService.getInstance();
const pubsubEngine = Container.get<PubSubEngine>('pubsub');
const notificationService = NotificationService.getInstance();

export class CheckoutService {
  static getInstance() {

    return new CheckoutService(checkoutSdkService, primeTrustService, pubsubEngine, notificationService)
  }

  constructor(private checkoutSdk: CheckoutSdkService, private primeTrust: PrimeTrustService, private pubSub: PubSubEngine, private notification: NotificationService) { }

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

  private async processAssetTransfer(checkout: Checkout, quote: AssetQuote) {
    try {
      const user = await checkout.getUser()
      const assetTransferMethodRes = await this.primeTrust.createAssetTransferMethod(checkout.walletAddress, user.id, user.contactId);
      const assetTransferMethodId = assetTransferMethodRes.data.id

      await checkout.update({
        assetTransferMethodId
      })

      // TODO: need to calc fee correctly
      // const assetTransferMoney = checkout.getAssetTransferMoney(quote.unitCount);
      // const feeMoney = checkout.getFeeMoney(quote.unitCount);

      const res = await this.primeTrust.createAssetDisbursements(user.id, assetTransferMethodId, quote.unitCount);

      const assetTransferData = res.included.find((item) => item.type === 'asset-transfers')

      if (!assetTransferData) {
        throw new Error('Can not find asset transfer data')
      }

      // if (!feeMoney.isZero()) { // send fee to main custodial account
      //   await this.primeTrust.transferAssets(user.id, Config.primeTrustMainAccountId, feeMoney)
      // }

      await AssetTransfer.create({
        ...convertToAssetTransfer(assetTransferData),
        checkoutId: checkout.id,
        fee: 0,
        disbursementAuthorizationId: res.data.id
      })

      this.notification.publishTransactionStatus({
        checkoutId: checkout.id,
        status: 'processing',
        paidStatus: checkout.status,
        step: CheckoutStep.Asset,
        message: `Processing transfer assets for ${quote.unitCount} USDC`,
        transactionId: null,
        date: new Date()
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

      const checkoutRequest = await checkout?.getCheckoutRequest()
      await checkoutRequest?.update({
        status: PaidStatus.Error
      })

      await checkoutRequest?.sendWebhook()

      this.notification.publishTransactionStatus({
        checkoutId: checkout.id,
        status: 'failed',
        paidStatus: checkout.status,
        step: CheckoutStep.Asset,
        message: `Failed transfer assets for ${quote.unitCount} USDC`,
        transactionId: null,
        date: new Date()
      })
    }
  }

  async enableWebhook(userId: string) {
    const res = await this.primeTrust.getAccount(userId);
    const webhookConfigId = res?.included?.find((entry) => entry.type === 'webhook-configs')?.id

    if (webhookConfigId) {
      await this.primeTrust.enableWebHookConfig(webhookConfigId)
    }
  }

  private async processFundsTransfer(checkout: Checkout) {
    try {
      const res = await this.primeTrust.addFundsToAccount(checkout.totalChargeAmountMoney)

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

      this.notification.publishTransactionStatus({
        checkoutId: checkout.id,
        status: 'processing',
        paidStatus: checkout.status,
        step: CheckoutStep.Funds,
        message: `Processing funds for $${checkout.totalChargeAmountMoney.toUnit()}`,
        transactionId: null,
        date: new Date()
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

      const checkoutRequest = await checkout?.getCheckoutRequest()
      await checkoutRequest?.update({
        status: PaidStatus.Error
      })

      await checkoutRequest?.sendWebhook()

      this.notification.publishTransactionStatus({
        checkoutId: checkout.id,
        status: 'failed',
        paidStatus: checkout.status,
        step: CheckoutStep.Funds,
        message: `Failed Processing funds for $${checkout.totalChargeAmountMoney.toUnit()}`,
        transactionId: null,
        date: new Date()
      })

      throw err
    }
  }

  private async transferFunds(checkout: Checkout) {
    try {
      const res = await this.primeTrust.transferFunds(Config.primeTrustSettlementAccountId, checkout.userId, checkout.fundsAmountMoney)

      if (res.data.attributes.status === 'settled') {
        this.notification.publishTransactionStatus({
          checkoutId: checkout.id,
          status: 'settled',
          paidStatus: checkout.status,
          step: CheckoutStep.Funds,
          message: `Settled funds for $${checkout.totalChargeAmountMoney.toUnit()}`,
          transactionId: null,
          date: new Date()
        })

        await this.processQuote(checkout)
      } else {
        throw new Error(`Failed transfer funds: res.data.attributes.status`)
      }
    } catch (err) {
      log.warn({
        func: 'transferFunds',
        checkoutId: checkout.id,
        err,
      }, 'Failed transferFunds')

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
        step: CheckoutStep.Funds,
        message: `Failed transfer funds for $${checkout.fundsAmountMoney.toUnit()}`,
        transactionId: null,
        date: new Date()
      })
    }
  }

  private async processQuote(checkout: Checkout) {
    try {
      this.notification.publishTransactionStatus({
        checkoutId: checkout.id,
        status: 'processing',
        paidStatus: checkout.status,
        step: CheckoutStep.Quote,
        message: `Processing quote asset for $${checkout.fundsAmountMoney.toUnit()}`,
        transactionId: null,
        date: new Date()
      })

      const quotesRes = await this.primeTrust.createQuote(checkout.userId, checkout.fundsAmountMoney)
      const assetQuote = await AssetQuote.create({
        ...convertToQuote(quotesRes.data),
        checkoutId: checkout.id
      })

      await this.primeTrust.executeQuote(assetQuote.id)
    } catch (err) {
      log.warn({
        func: 'processQuote',
        checkoutId: checkout.id,
        err,
      }, 'Failed processQuote')

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
        step: CheckoutStep.Quote,
        message: `Failed quote assets for $${checkout.fundsAmountMoney.toUnit()}`,
        transactionId: null,
        date: new Date()
      })
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

      const user = await checkout.getUser();

      await this.enableWebhook(user.id);
      // await this.processFundsTransfer(checkout);

      if (!Config.isProduction) {
        await this.primeTrust.sandboxAddFunds(Config.primeTrustSettlementAccountId, checkout.totalChargeAmountMoney)
      }

      await this.transferFunds(checkout)
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
      await asyncLock(`funds-transfer-update/${fundsTransferId}`, async () => {
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

        if (fundsTransfer.status === 'cancelled') {
          throw new Error('The funds transfer cancelled')
        }

        if (fundsTransfer.status === 'reversed') {
          throw new Error('The funds transfer reversed')
        }

        if (fundsTransfer.status !== 'settled') {
          return
        }

        if (!fundsTransfer.contingenciesClearedAt && !Config.isProduction) { // sandbox only for clear holds
          if (!Config.isProduction) {
            const contingentHolds = res.included?.filter((item) => item.type === 'contingent-holds' && item.attributes.status === 'pending' && contingentHoldIds.includes(item.id)) || []

            for (const contingentHold of contingentHolds) {
              await this.primeTrust.sandboxClearFundsTransfer(contingentHold.id)
            }
          }

          return
        }

        if (checkout.userId === Config.primeTrustSettlementAccountId) {
          this.notification.publishTransactionStatus({
            checkoutId: checkout.id,
            status: 'settled',
            paidStatus: checkout.status,
            step: CheckoutStep.Funds,
            message: `Settled funds for $${checkout.totalChargeAmountMoney.toUnit()}`,
            transactionId: null,
            date: new Date()
          })

          await this.processQuote(checkout)
        } else {
          await this.transferFunds(checkout)
        }
      })
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

        const checkoutRequest = await checkout?.getCheckoutRequest()
        await checkoutRequest?.update({
          status: PaidStatus.Error
        })

        await checkoutRequest?.sendWebhook()

        this.notification.publishTransactionStatus({
          checkoutId: checkout.id,
          status: 'failed',
          paidStatus: checkout.status,
          step: CheckoutStep.Funds,
          message: `Failed funds for $${checkout.totalChargeAmountMoney.toUnit()}`,
          transactionId: null,
          date: new Date()
        })
      }

      throw err
    }
  }

  private async quotesUpdateHandler(assetQuoteId: string) {
    let checkout: Checkout;

    try {
      await asyncLock(`quotes-update/${assetQuoteId}`, async () => {
        const quote = await AssetQuote.findByPk(assetQuoteId);

        if (!quote) {
          return
        }

        checkout = await quote.getCheckout()
        const res = await this.primeTrust.getQuote(assetQuoteId);

        await quote.update(convertToQuote(res.data));

        if (quote.status === 'cancelled') {
          throw new Error('The asset quote cancelled')
        }

        if (quote.status === 'expired') {
          throw new Error('The asset quote expired')
        }

        if (quote.status !== 'settled') {
          return
        }

        await this.processAssetTransfer(checkout, quote)
      })
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

        const checkoutRequest = await checkout?.getCheckoutRequest()
        await checkoutRequest?.update({
          status: PaidStatus.Error
        })

        await checkoutRequest?.sendWebhook()

        this.notification.publishTransactionStatus({
          checkoutId: checkout.id,
          status: 'failed',
          paidStatus: checkout.status,
          step: CheckoutStep.Quote,
          message: `Failed quote assets $${checkout.amountMoney.toUnit()}`,
          transactionId: null,
          date: new Date()
        })
      }

      throw err
    }
  }

  private async assetTransferUpdateHandler(assetTransferId: string) {
    let checkout: Checkout;
    let assetTransfer: AssetTransfer;

    try {
      await asyncLock(`asset-transfer-update/${assetTransferId}`, async () => {
        assetTransfer = await AssetTransfer.findByPk(assetTransferId);

        if (!assetTransfer) {
          return
        }

        const checkout = await assetTransfer.getCheckout()
        const res = await this.primeTrust.getAssetTransfer(assetTransferId);

        await assetTransfer.update(convertToAssetTransfer(res.data));

        if (assetTransfer.status === 'cancelled') {
          throw new Error('The asset transfer cancelled')
        }

        if (assetTransfer.status === 'reversed') {
          throw new Error('The asset transfer reversed')
        }

        if (!Config.isProduction && assetTransfer.contingenciesClearedAt && assetTransfer.status === 'pending') {
          await this.primeTrust.sandboxSettleAssetTransfer(assetTransfer.id)
        }

        if (assetTransfer.status !== 'settled' || checkout.status === PaidStatus.Paid) {
          return
        }

        await checkout.update({
          status: PaidStatus.Paid
        })

        const checkoutRequest = await checkout?.getCheckoutRequest()
        await checkoutRequest?.update({
          status: PaidStatus.Paid
        })

        await checkoutRequest?.sendWebhook(Math.abs(assetTransfer.unitCount), assetTransfer.transactionHash)
        await checkout.sendReceipt()
        this.notification.publishTransactionStatus({
          checkoutId: checkout.id,
          step: CheckoutStep.Asset,
          status: 'settled',
          paidStatus: checkout.status,
          transactionId: assetTransfer.transactionHash,
          message: `Settled transfer assets for ${Math.abs(assetTransfer.unitCount)} USDC`,
          date: new Date()
        })
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

        const checkoutRequest = await checkout?.getCheckoutRequest()
        await checkoutRequest?.update({
          status: PaidStatus.Error
        })

        await checkoutRequest?.sendWebhook()

        this.notification.publishTransactionStatus({
          checkoutId: checkout.id,
          step: CheckoutStep.Asset,
          status: 'failed',
          paidStatus: checkout.status,
          transactionId: null,
          message: `Failed transfer assets for ${Math.abs(assetTransfer.unitCount)} USDC`,
          date: new Date()
        })
      }

      throw err
    }
  }

  async contactUpdateHandler(data: any) {
    const contactId = data['resource-id']
    let user: User;
    try {
      await asyncLock(`contact-update/${contactId}`, async () => {
        user = await User.findOne({
          where: {
            contactId
          }
        })

        if (!user) {
          return
        }

        if (data.data && data.data['kyc-required-actions']?.length > 0) {
          throw new Error('Failed KYC verification')
        }

        const contactResponse = await this.primeTrust.getContact(contactId);
        const accountResponse = await this.primeTrust.getAccount(user.id)

        await user.update({
          ...convertToContact(contactResponse.data),
          status: accountResponse.data.attributes.status
        })


        this.notification.publishUserStatus({
          userId: user.id,
          status: user.status,
          error: '',
          token: user.status === 'opened' ? UserService.generateJWTToken(user) : undefined,
        })
      })
    } catch (err) {
      log.warn({
        func: 'contactUpdateHandler',
        contactId,
        err
      }, 'Failed contactUpdateHandler')

      if (user) {
        user.status = 'error';
        await user.save()

        this.notification.publishUserStatus({
          userId: user.id,
          status: user.status,
          error: err.message,
          token: ''
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

    try {
      switch (data['resource-type']) {
        // case 'funds_transfers':
        //   await this.fundsTransferUpdateHandler(data['resource_id'])
        case 'facilitated_trades':
          await this.quotesUpdateHandler(data['resource_id'])
        case 'asset_transfers':
          await this.assetTransferUpdateHandler(data['resource_id'])
        case 'contacts':
          await this.contactUpdateHandler(data)
        case 'contacts':
          await this.contactUpdateHandler(data)
        default:
          return
      }
    } catch (err) {
      log.warn({
        func: 'webhookHandler',
        data,
        err,
      }, 'Failed webhook handler')
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