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
import { convertToAssetTransfer, convertToCharge, convertToContact, convertToFundsTransfer, convertToQuote } from "../utils/convert";

import { PaidStatus } from "../types/paidStatus.type";
import { CheckoutStep } from "../types/checkoutStep.type";
import { TransactionType } from "../types/transaction.type";
import { asyncLock } from "../utils/lock";
import { CheckoutInputType } from "../types/checkout-input.type";
import { CustodialAccount } from "../models/CustodialAccount";

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

  async processWithCustodial(data: CheckoutInputType) {
    const res = await this.primeTrust.createCustodialAccount(data)

    const contact = await res.included?.find((entity) => entity.type === 'contacts');

    if (!contact) {
      throw new Error(`Can\'t find a contact for account ${res.data.id}`)
    }

    const custodialAccount = await CustodialAccount.create({
      id: res.data.id,
      contactId: contact.id,
      status: res.data.attributes.status,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phoneNumber: data.phoneNumber,
      gender: data.gender,
      dob: data.dob,
      taxId: data.taxId,
      streetAddress: data.streetAddress,
      streetAddress2: data.streetAddress2,
      city: data.city,
      state: data.state,
      zip: data.zip,
      country: data.country,
      deviceId: data.deviceId,
      documentId: data.documentId
    })

    if (!Config.isProduction) {
      this.primeTrust.sandboxOpenAccount(res.data.id)
    }

    const checkout = await Checkout.create({
      ...data,
      custodialAccountId: custodialAccount.id,
    });

    this.publishNotification({
      checkoutId: checkout.id,
      step: CheckoutStep.KYC,
      status: 'processing',
      paidStatus: checkout.status,
      message: `Processing KYC`,
      transactionId: null,
      date: new Date()
    })

    return checkout
  }

  async processAlone(data: CheckoutInputType) {
    const checkout = await Checkout.create({
      ...data,
      custodialAccountId: Config.primeTrustAccountId,
    });

    this.processCheckout(checkout)

    return checkout
  }

  private async processCharge(checkout: Checkout) {
    try {
      this.publishNotification({
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
      await Charge.create({
        checkoutId: checkout.id,
        ...chargeData
      })

      this.publishNotification({
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

      this.publishNotification({
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
      const custodialAccount = await checkout.getCustodialAccount()
      const assetTransferMethodRes = await this.primeTrust.createAssetTransferMethod(custodialAccount.id, custodialAccount.contactId, checkout.walletAddress);
      const assetTransferMethodId = assetTransferMethodRes.data.id

      await checkout.update({
        assetTransferMethodId
      })

      const res = await this.primeTrust.createAssetDisbursements(custodialAccount.id, assetTransferMethodId, quote.unitCount);
      const assetTransferData = res.included.find((item) => item.type === 'asset-transfers')

      if (!assetTransferData) {
        throw new Error('Can not find asset transfer data')
      }

      await AssetTransfer.create({
        ...convertToAssetTransfer(assetTransferData),
        checkoutId: checkout.id,
        disbursementAuthorizationId: res.data.id
      })

      this.publishNotification({
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

      this.publishNotification({
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

      this.publishNotification({
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

      this.publishNotification({
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
      const res = await this.primeTrust.transferFunds(checkout.custodialAccountId, checkout.fundsAmountMoney)

      if (res.data.attributes.status === 'settled') {
        this.publishNotification({
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

      this.publishNotification({
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
      const quotesRes = await this.primeTrust.createQuote(checkout.custodialAccountId, checkout.fundsAmountMoney)
      const assetQuote = await AssetQuote.create({
        ...convertToQuote(quotesRes.data),
        checkoutId: checkout.id
      })

      await this.primeTrust.executeQuote(assetQuote.id)

      this.publishNotification({
        checkoutId: checkout.id,
        status: 'processing',
        paidStatus: checkout.status,
        step: CheckoutStep.Quote,
        message: `Processing quote asset for $${checkout.fundsAmountMoney.toUnit()}`,
        transactionId: null,
        date: new Date()
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

      const checkoutRequest = await checkout?.getCheckoutRequest()
        await checkoutRequest?.update({
          status: PaidStatus.Error
        })
  
        await checkoutRequest?.sendWebhook()

      this.publishNotification({
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

        if (checkout.custodialAccountId === Config.primeTrustAccountId) {
          this.publishNotification({
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

        this.publishNotification({
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

        this.publishNotification({
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

        this.publishNotification({
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

        this.publishNotification({
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
    let checkout: Checkout;
    let custodialAccount: CustodialAccount;

    try {
      await asyncLock(`contact-update/${contactId}`, async () => {
        custodialAccount = await CustodialAccount.findOne({
          where: {
            contactId
          }
        })

        if (!custodialAccount) {
          return
        }

        checkout = await Checkout.findOne({
          where: {
            custodialAccountId: custodialAccount.id
          }
        })

        if (!checkout) {
          return
        }

        if (data['kyc-required-actions'].length > 0) {
          throw new Error('Failed KYC verification')
        }

        const contactResponse = await this.primeTrust.getContact(contactId);
        const accountResponse = await this.primeTrust.getAccount(custodialAccount.id)

        await custodialAccount.update({
          ...convertToContact(contactResponse.data),
          status: accountResponse.data.attributes.status
        })

        if (!custodialAccount.isVerified) {
          return
        }
        
        this.processCheckout(checkout)
        this.publishNotification({
          checkoutId: checkout.id,
          step: CheckoutStep.KYC,
          status: 'verified',
          paidStatus: checkout.status,
          transactionId: '',
          message: `Verified KYC`,
          date: new Date()
        })
      })
    } catch (err) {
      log.warn({
        func: 'contactUpdateHandler',
        contactId,
        checkoutId: checkout?.id,
        err
      }, 'Failed contactUpdateHandler')

      if (checkout) {
        await checkout.update({
          status: PaidStatus.Error
        })

        const checkoutRequest = await checkout?.getCheckoutRequest()
        await checkoutRequest?.update({
          status: PaidStatus.Error
        })
  
        await checkoutRequest?.sendWebhook()

        this.publishNotification({
          checkoutId: checkout.id,
          step: CheckoutStep.Asset,
          status: 'failed',
          paidStatus: checkout.status,
          transactionId: null,
          message: `Failed KYC verification`,
          date: new Date()
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

    try {
      switch (data['resource-type']) {
        case 'funds_transfers':
          await this.fundsTransferUpdateHandler(data['resource_id'])
        case 'facilitated_trades':
          await this.quotesUpdateHandler(data['resource_id'])
        case 'asset_transfers':
          await this.assetTransferUpdateHandler(data['resource_id'])
        case 'contact':
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
}