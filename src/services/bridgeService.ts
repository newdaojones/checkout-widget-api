import Axios, { AxiosInstance, AxiosRequestConfig, CreateAxiosDefaults } from "axios";
import { Config } from "../config";
import { log } from "../utils";

export class BridgeService {
  constructor(private axios: AxiosInstance) { }

  static getInstance() {
    const axios = Axios.create({
      baseURL: `${Config.bridgeApiURI}`,
      headers: {
        'Api-Key': Config.bridgeApiKey
      }
    })

    axios.interceptors.response.use(
      response => response,
      error => {
        throw error.response.data
      }
    )

    const instance = new BridgeService(axios)
    return instance
  }

  async send(config: AxiosRequestConfig<any>, uuid?: string) {
    log.info({
      func: 'brideService.send',
      uuid,
      ...config
    }, `Sending ${config.url} request`)

    try {
      const res = await this.axios.request({
        ...config,
        headers: {
          ...config.headers,
          'Idempotency-Key': uuid
        }
      })

      return res
    } catch (err) {
      log.info({
        func: 'brideService.send',
        uuid,
        ...config,
        err
      }, `Failed ${config.url} request`)

      throw new Error(err.message)
    }
  }

  async createTermsOfServiceUrl(uuid: string): Promise<string> {
    const res = await this.send({
      method: 'POST',
      url: '/customers/tos_links'
    }, uuid)

    return res.data.url
  }

  async createCustomer(data: any, uuid: string) {
    const res = await this.send({
      method: 'POST',
      url: '/customers',
      data
    }, uuid)

    return res.data
  }

  async createKycUrl(customerId: string): Promise<string> {
    const res = await this.send({
      method: 'GET',
      url: `customers/${customerId}/id_verification_link`,
      params: {
        redirect_uri: `${Config.frontendUri}/kyc-success`
      }
    })

    return res.data.url
  }

  async getCustomer(customerId: string): Promise<any> {
    const res = await this.send({
      method: 'GET',
      url: `customers/${customerId}`
    })

    return res.data
  }
}