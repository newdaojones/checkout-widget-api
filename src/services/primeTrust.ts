import Axios, { AxiosInstance, AxiosRequestConfig, CreateAxiosDefaults } from "axios";
import { Config } from "../config";
import { PrimeTrustAccount } from "../models/PrimeTrustAccount";
import * as moment from 'moment-timezone'
import { log } from "../utils";
import { CheckoutInputType } from "../types/checkout-input.type";
import { parsePhoneNumber } from "libphonenumber-js";

export class PrimeTrustService {
  account: PrimeTrustAccount;

  constructor(private axiosInstance: AxiosInstance) { }

  static getInstance() {
    const axios = Axios.create({
      baseURL: `${Config.primeTrustApiUri}`
    })

    axios.interceptors.response.use(
      response => response,
      error => {
        const errorData = error.response?.data?.errors && error.response?.data?.errors[0]
        if (errorData?.status) {
          throw {
            status: errorData.status,
            message: errorData.detail || errorData.title,
            response: error.response?.data
          }
        }

        throw error.response || error
      }
    )

    const instance = new PrimeTrustService(axios)

    instance.setAccount(Config.primeTrustAccountEmail)

    return instance
  }

  async setAccount(email: string) {
    const account = await PrimeTrustAccount.findOne({
      where: {
        email
      }
    })

    if (!account) {
      throw new Error(`Can not find prime trust account for ${email}`)
    }

    this.account = account;
  }

  private async getServerIp() {
    const res = await Axios.request({
      url: 'https://ifconfig.co',
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })

    return res.data.ip
  }

  private async getToken() {
    try {
      if (!this.account) {
        return
      }

      const expiresAt = moment.utc().add(1, 'month')
      // const ipAddress = await this.getServerIp();

      const res = await this.axiosInstance.request({
        method: 'POST',
        url: '/auth/jwts',
        data: {
          expires_at: expiresAt.toISOString(),
          // cidr: [`${ipAddress}/32`]
        },
        auth: {
          username: Config.primeTrustAccountEmail,
          password: Config.primeTrustAccountPassword
        }
      })

      const token = res.data.token;

      if (!token) {
        throw new Error('Failed get token')
      }

      await this.account.update({
        token,
        expiresAt: expiresAt.toDate()
      })
    } catch (err) {
      log.warn({
        func: 'PrimeTrustService.getToken',
        err
      }, 'Failed get token')
      throw err
    }
  }

  async request<T>(config: AxiosRequestConfig<any>) {
    try {
      if (!this.account) {
        await this.setAccount(Config.primeTrustAccountEmail)
      }

      const fiveMinAfter = moment.utc().add(5, 'minutes')
      const isExpired = !this.account.expiresAt || moment.utc(this.account.expiresAt).isBefore(fiveMinAfter)

      if (isExpired) {
        await this.getToken()
      }

      const res = await this.axiosInstance.request<T>({
        ...config,
        headers: {
          Authorization: `Bearer ${this.account.token}`
        }
      });

      return res
    } catch (err) {
      log.warn({
        func: 'PrimeTrustService.request',
        data: config,
        err
      }, 'Failed send request to prime trust')

      if (err.status === 401) {
        await this.getToken()

        return this.axiosInstance.request<T>({
          ...config,
          headers: {
            Authorization: `Bearer ${this.account.token}`
          }
        });
      }

      throw err;
    }
  }

  async createAssetTransferMethod(userWalletAddress: string, accountId: string, contactId: string) {
    const res = await this.request<any>({
      method: 'POST',
      url: '/v2/asset-transfer-methods',
      data: {
        data: {
          type: "asset-transfer-methods",
          attributes: {
            "asset-id": Config.primeTrustUsdcAssetId,
            "contact-id": contactId,
            "account-id": accountId,
            "asset-transfer-type": "ethereum",
            "transfer-direction": "outgoing",
            "label": "User purchase for USDC",
            "wallet-address": userWalletAddress
          }
        }
      }
    })

    return res.data
  }

  async createAssetDisbursements(accountId: string, assetTransferMethodId: string, amount: number) {
    const res = await this.request<any>({
      method: 'POST',
      url: '/v2/asset-disbursements?include=asset-transfer,disbursement-authorization',
      data: {
        data: {
          type: "asset-disbursements",
          attributes: {
            "account-id": accountId,
            "unit-count": amount,
            "asset-transfer": {
              "asset-transfer-method-id": assetTransferMethodId
            },
            "hot-transfer": false,
            "owner-verification-type": "waived_by_owner"
          }
        }
      }
    })

    return res.data;
  }

  async sandboxDisbursementAuthorizations(disbursementAuthorizationId: string) {
    const res = await this.request<any>({
      method: 'POST',
      url: `/v2/disbursement-authorizations/${disbursementAuthorizationId}/sandbox/verify-owner`,
    })

    return res.data;
  }

  async sandboxSettleAssetTransfer(assetTransferId) {
    const res = await this.request<any>({
      method: 'POST',
      url: `/v2/asset-transfers/${assetTransferId}/sandbox/settle`,
      data: {
        data: {
          type: "asset-transfers",
          attributes: {
            "settlement-details": "Transfer confirmed in transaction with hash 0x1f265eff3ab28ada13b53f0f663164221379d0a244cd8239d999ee1cbedc83cc.",
            "transaction-hash": "0x1f265eff3ab28ada13b53f0f663164221379d0a244cd8239d999ee1cbedc83cc",
            "comments-1": "comments: Asset received via sandbox/settle. max length 60",
            "comments-2": "comments2: This is space for additional comments."
          }
        }
      }
    })

    return res.data;
  }

  async addFundsToAccount(amount: Dinero.Dinero) {
    const res = await this.request<any>({
      method: 'POST',
      url: '/v2/contributions?include=funds-transfer',
      data: {
        data: {
          type: "contributions",
          attributes: {
            "account-id": Config.primeTrustAccountId,
            "contact-id": Config.primeTrustContactId,
            "funds-transfer-method-id": Config.primeTrustFundsTransferMethodId,
            amount: amount.toUnit()
          }
        }
      }
    })

    return res.data;
  }

  async getFundsTransfer(fundsTransferId: string) {
    const res = await this.request<any>({
      method: 'GET',
      url: `v2/funds-transfers?filter[id eq]=${fundsTransferId}&include=contingent-holds`
    })

    return res.data
  }

  async sandboxSettleFundsTransfer(fundsTransferId: string) {
    const res = await this.request<any>({
      method: 'POST',
      url: `/v2/funds-transfers/${fundsTransferId}/sandbox/settle`,
    })

    return res.data;
  }

  async sandboxClearFundsTransfer(contingentHoldId: string) {
    const res = await this.request<any>({
      method: 'POST',
      url: `/v2/contingent-holds/${contingentHoldId}/sandbox/clear`,
    })

    return res.data;
  }

  async createQuote(accountId: string, amount: Dinero.Dinero) {
    const res = await this.request<any>({
      method: 'POST',
      url: `/v2/quotes`,
      data: {
        data: {
          type: "quotes",
          attributes: {
            "account-id": accountId,
            "asset-id": Config.primeTrustUsdcAssetId,
            "transaction-type": "buy",
            amount: amount.toUnit(),
            hot: false
          }
        }
      }
    })

    return res.data;
  }

  async transferFunds(contactId, amount: Dinero.Dinero) {
    const res = await this.request<any>({
      method: 'POST',
      url: 'v2/account-cash-transfers',
      data: {
        data : {
            type : "account-cash-transfers",
            attributes : {
                amount : amount.toUnit(),
                "from-account-id" : Config.primeTrustAccountId,
                "to-account-id" : contactId
            }
        }
      }
    })

    return res.data
  }

  async executeQuote(quoteId: string) {
    const res = await this.request<any>({
      method: 'POST',
      url: `/v2/quotes/${quoteId}/execute`,
    })

    return res.data;
  }

  async getQuote(quoteId: string) {
    const res = await this.request<any>({
      method: 'GET',
      url: `/v2/quotes/${quoteId}`
    })

    return res.data
  }

  async getAssetTransfer(id: string) {
    const res = await this.request<any>({
      method: 'GET',
      url: `/v2/asset-transfers/${id}`
    })

    return res.data
  }

  async createCustodialAccount(data: CheckoutInputType) {
    const phoneNumberObject = parsePhoneNumber(data.phoneNumber);

    if (!phoneNumberObject.isValid()) {
      throw new Error('Invalid phone number')
    }

    const name = `${data.firstName} ${data.lastName}`
    const primaryAddress = Config.isProduction ? {
      "street-1": data.streetAddress,
      "street-2": data.streetAddress2,
      "postal-code": data.zip,
      "city": data.city,
      "region": data.state,
      "country": data.country
    } : {
      "street-1": data.streetAddress,
      "street-2": "happy",
      "postal-code": "89145",
      "city": "Las Vegas",
      "region": "NV",
      "country": "US"
    }

    const requestBody = {
      data: {
        type: "account",
        attributes: {
          "account-type": "custodial",
          name: `Account ${name}`,
          "authorized-signature": name,
          owner: {
            "contact-type": "natural_person",
            name: name,
            email: data.email,
            "date-of-birth": data.dob,
            "tax-id-number": data.taxId,
            "tax-country": data.country,
            "socure-document-id": data.documentId,
            "socure-device-id": data.deviceId,
            "primary-phone-number": {
              country: phoneNumberObject.country,
              number: phoneNumberObject.formatNational().replace(/[()+\- ]/g, ''),
              sms: true
            },
            "primary-address": primaryAddress
          },
          "webhook-config": {
            "contact-email": Config.primeTrustAccountEmail,
            "url": `${Config.uri}/primeTrustWebhook`,
            "enabled": true,
            "shared-secret": "shared-webhook-secret"
          }
        }
      }
    }

    const res = await this.request<any>({
      method: 'POST',
      url: '/v2/accounts?include=owners,contacts,webhook-config',
      data: requestBody
    })

    return res.data
  }

  async getCipChecks(contactId: string) {
    const res = await this.request<any>({
      method: 'GET',
      url: `/v2/cip-checks?filter[status]=pending&sort=-created-at&contact.id=${contactId}`
    })

    return res.data
  }

  async getCipCheck(cipCheckId: string) {
    const res = await this.request<any>({
      method: 'GET',
      url: `/v2/cip-check/${cipCheckId}`
    })

    return res.data
  }

  async sandboxVerifyCipCheck(cipCheckId: string) {
    const res = await this.request<any>({
      method: 'POST',
      url: `/v2/cip-checks/${cipCheckId}/sandbox/approve`
    })

    return res.data
  }

  async getAccount(accountId: string) {
    const res = await this.request<any>({
      method: 'GET',
      url: `/v2/accounts/${accountId}`
    })

    return res.data
  }

  async getContact(contactId: string) {
    const res = await this.request<any>({
      method: 'GET',
      url: `/v2/contacts/${contactId}?include=primary-address,primary-phone-number`
    })

    return res.data
  }

  async sandboxOpenAccount(accountId: string) {
    const res = await this.request<any>({
      method: 'POST',
      url: `/v2/accounts/${accountId}/sandbox/open`,
    })

    return res.data;
  }

  async getWebhookConfigs() {
    const res = await this.request<any>({
      method: 'GET',
      url: `/v2/webhook-configs`,
    })

    return res.data
  }

  async enableWebHookConfig(webhookConfigId: string) {
    const res = await this.request<any>({
      method: 'PATCH',
      url: `/v2/webhook-configs/${webhookConfigId}`,
      data: {
        "data": {
          "type": "webhook-configs",
          "attributes": {
            "url": `${Config.uri}/primeTrustWebhook`,
            "enabled": true
          }
        }
      }
    })

    return res.data
  }

  async createAccountPolicySandbox(accountId: string) {
    const res = await this.request<any>({
      method: 'POST',
      url: `/v2/account-policies/sandbox`,
      data: {
        "data": {
          "type": "account-policies",
          "attributes": {
              "account-id": accountId,
              "manual-authorization-on-asset-disbursements": false,
              "owner-verification-on-asset-disbursements": false,
              "require-contact-on-outgoing-asset-transfers": false,
              "review-asset-transfers": false,
              "allow-organizational-contacts": true
          }
        }
      }
    })

    return res.data
  }
}