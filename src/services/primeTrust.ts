import Axios, { AxiosInstance, AxiosRequestConfig, CreateAxiosDefaults } from "axios";
import { Config } from "../config";
import { PrimeTrustAccount } from "../models/PrimeTrustAccount";
import * as moment from 'moment-timezone'
import { log } from "../utils";
import { Dinero, DineroObject } from "dinero.js";

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
            "settlement-details": "Transfer confirmed in transaction with hash cafe0c950a24ddb06517a73b592d8682e86c9d79a2bbc7b3afc1073610ebfc0c.",
            "transaction-hash": "cafe0c950a24ddb06517a73b592d8682e86c9d79a2bbc7b3afc1073610ebfc0c",
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
}