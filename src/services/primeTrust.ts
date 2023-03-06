import Axios, { AxiosInstance, CreateAxiosDefaults } from "axios";
import { Config } from "../config";
import { PrimeTrustAccount } from "../models/PrimeTrustAccount";

export class PrimeTrustService {
  account: PrimeTrustAccount;

  constructor(private axiosInstance: AxiosInstance) {}
  
  static getInstance() {
    const axios = Axios.create({
      baseURL: `${Config.primeTrustApiUri}/v2`
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

  getToken(email: string, password: string) {

  }
}