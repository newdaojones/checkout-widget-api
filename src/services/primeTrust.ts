import Axios, { AxiosInstance, AxiosRequestConfig, CreateAxiosDefaults } from "axios";
import { Config } from "../config";
import { PrimeTrustAccount } from "../models/PrimeTrustAccount";
import * as moment from 'moment-timezone'
import { log } from "../utils";

export class PrimeTrustService {
  account: PrimeTrustAccount;

  constructor(private axiosInstance: AxiosInstance) { }

  static getInstance() {
    const axios = Axios.create({
      baseURL: `${Config.primeTrustApiUri}`
    })

    const instance = new PrimeTrustService(axios)

    instance.setAccount(Config.primeTrustAccountEmail)
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
      method: 'GET'
    })

    return res.data.ip
  }

  private async getToken() {
    try {
      if (!this.account) {
        return
      }

      const expiresAt = moment.utc().add(1, 'month')
      const ipAddress = await this.getServerIp();
      const res = await this.axiosInstance.request({
        method: 'POST',
        url: '/auth/jwts',
        data: {
          expires_at: expiresAt.toISOString(),
          cidr: [`${ipAddress}/32`]
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

      const res = await this.axiosInstance.request<T>(config);

      return res
    } catch (err) {
      log.warn({
        func: 'PrimeTrustService.request',
        data: config,
        err
      }, 'Failed send request to prime trust')

      if (err.status === 401) {
        await this.getToken()

        return this.axiosInstance.request<T>(config)
      }

      throw err;
    }
  }

  async createAssetTransferMethod(userWalletAddress: string) {
    const res = await this.request({
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
    const res = await this.request({
      method: 'POST',
      url: '/v2/asset-disbursements?include=asset-transfer,disbursement-authorization',
      data: {
        data: {
          type: "asset-disbursements",
          attributes: {
            "account-id": Config.primeTrustAccountId,
            "unit-count": amount.toFixed(2),
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

  async addFundsToAccount(amount: number) {
    const res = await this.request({
      method: 'POST',
      url: '/v2/contributions?include=funds-transfer',
      data: {
        data: {
          type: "contributions",
          attributes: {
            "account-id": Config.primeTrustAccountId,
            "contact-id": Config.primeTrustContactId,
            "funds-transfer-method-id": Config.primeTrustFundsTransferMethodId,
            amount: amount.toFixed(2)
          }
        }
      }
    })

    return res.data;
  }
}