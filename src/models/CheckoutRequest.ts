import axios from 'axios';
import { Model, Table, Column, PrimaryKey, AllowNull, DataType, Default, IsEmail, HasOne, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { PaidStatus } from '../types/paidStatus.type';
import { log } from '../utils';
import shortUUID from 'short-uuid';

import { Checkout } from './Checkout'
import { Partner } from './Partner';

@Table({
  tableName: 'checkoutRequests',
  name: {
    singular: 'checkoutRequest',
    plural: 'checkoutRequests'
  }
})
export class CheckoutRequest extends Model<CheckoutRequest> {
  @PrimaryKey
  @AllowNull(false)
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(true)
  @Column(DataType.UUID)
  @ForeignKey(() => Partner)
  partnerId!: string;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.STRING(255))
  partnerOrderId!: string;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  walletAddress!: string;

  @AllowNull(true)
  @IsEmail
  @Default(null)
  @Column(DataType.STRING(100))
  email!: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  phoneNumber!: string;

  @AllowNull(false)
  @Default('USD')
  @Column(DataType.STRING(3))
  currency!: string;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  amount!: number

  @AllowNull(false)
  @Default('pending')
  @Column(DataType.ENUM('pending', 'processing', 'paid', 'postponed', 'error'))
  status!: PaidStatus;

  @Column(DataType.DATE)
  createdAt!: Date;

  @Column(DataType.DATE)
  updatedAt!: Date;

  @HasOne(() => Checkout)
  checkout!: Checkout;
  getCheckout!: () => Promise<Checkout>;

  @BelongsTo(() => Partner)
  partner!: Partner;
  getPartner!: () => Promise<Partner>;

  async sendWebhook(amount?: number, transactionHash?: string) {
    const partner = await this.getPartner()
    if (!partner?.webhook) {
      return
    }

    try {
      await axios.post(partner.webhook, {
        id: this.id,
        walletAddress: this.walletAddress,
        email: this.email,
        phoneNumber: this.phoneNumber,
        status: this.status,
        partnerOrderId: this.partnerOrderId,
        amount,
        transactionHash,
      })
    } catch (err) {
      log.warn({
        func: 'sendWebhook',
        err
      }, 'Failed send request')
    }
  }

  static async generateCheckoutRequest(data: Partial<CheckoutRequest>) {
    return CheckoutRequest.create({
      ...data,
      id: shortUUID.generate()
    })
  }
}
