import Axios, { AxiosInstance, AxiosRequestConfig, CreateAxiosDefaults } from "axios";
import { Config } from "../config";
import { PrimeTrustAccount } from "../models/PrimeTrustAccount";
import * as moment from 'moment-timezone'
import { log } from "../utils";
import { Dinero, DineroObject } from "dinero.js";
import { Checkout } from "../models/Checkout";
import { CheckoutInputType } from "../types/checkout-input.type";
import { CustodialAccount } from "../models/CustodialAccount";

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
        throw new Error('Account is not initialized')
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

  async createAssetTransferMethod(userWalletAddress: string) {
    const res = await this.request<any>({
      method: 'POST',
      url: '/v2/asset-transfer-methods',
      data: {
        data: {
          type: "asset-transfer-methods",
          attributes: {
            "asset-id": Config.primeTrustUsdcAssetId,
            "contact-id": Config.primeTrustContactId,
            "account-id": Config.primeTrustAccountId,
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

  async createAssetDisbursements(assetTransferMethodId: string, amount: number) {
    const res = await this.request<any>({
      method: 'POST',
      url: '/v2/asset-disbursements?include=asset-transfer,disbursement-authorization',
      data: {
        data: {
          type: "asset-disbursements",
          attributes: {
            "account-id": Config.primeTrustAccountId,
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

  async createQuote(amount: Dinero.Dinero) {
    const res = await this.request<any>({
      method: 'POST',
      url: `/v2/quotes`,
      data: {
        data: {
          type: "quotes",
          attributes: {
            "account-id": Config.primeTrustAccountId,
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

  async setupCustodialAccount(data: CheckoutInputType) {
    const res = await this.createCustodialAccount(data);
    const contact = await res.included?.find((entity) => entity.type === 'contacts');

    if (!contact) {
      throw new Error(`Can\'t find a contact for account ${res.data.id}`)
    }

    const custodialAccount = await CustodialAccount.create({
      id: res.data.id,
      contactId: contact.id,
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
      country: data.country
    })
  }

  async createCustodialAccount(data: CheckoutInputType) {
    const name = `${data.firstName} ${data.lastName}`
    const res = await this.request<any>({
      method: 'POST',
      url: '/v2/accounts?include=owners,contacts,webhook-config',
      data: {
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
              "primary-phone-number": {
                country: "US",
                number: data.phoneNumber,
                sms: true
              },
              "primary-address": {
                "street-1": data.streetAddress,
                "street-2": data.streetAddress2,
                "postal-code": data.zip,
                city: data.city,
                region: data.state,
                country: data.country
              }
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

  async uploadDocument(contactId: string, type: string, documentType: string, file: any) {
    const res = await this.request<any>({
      method: 'POST',
      url: '/v2/uploaded-documents',
      data: {
        'contact-id': contactId,
        description: `${type} of Driver\'s License`,
        label: `${type} Driver's License`,
        file,
        public: true
      }
    })

    return res.data
  }

  async submitDocumentCheck(contractId, frontId: string, backId: string, type: string) {
    const res = await this.request<any>({
      method: 'POST',
      url: '',
      data: {
        data: {
          type: "kyc-document-checks",
          attributes: {
            "contact-id": contractId,
            "uploaded-document-id": frontId,
            "backside-document-id": backId,
            "kyc-document-type": type,
            "identity": true,
            "identity-photo": true,
            "proof-of-address": true,
            "kyc-document-country": "US"
          }
        }
      }
    })

    return res.data
  }

  async sandboxVerifyDocumentCheck(documentCheckId: string) {
    const res = await this.request<any>({
      method: 'POST',
      url: `/v2/kyc-document-checks/${documentCheckId}/sandbox/verify`
    })

    return res.data
  }
}