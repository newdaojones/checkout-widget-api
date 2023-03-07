import { Model, Table, Column, PrimaryKey, AutoIncrement, AllowNull, DataType, Default, IsEmail } from 'sequelize-typescript';
import { PaidStatus } from '../types/paidStatus.type';
import { TipType } from '../types/tip.type';
import { newDinero } from '../utils/dinero';

@Table
export class Checkout extends Model<Checkout> {
  @PrimaryKey
  @AllowNull(false)
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  walletAddress!: string;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.STRING(255))
  assetTransferId!: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  firstName!: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  lastName!: string;

  @AllowNull(false)
  @IsEmail
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
  @Default(0)
  @Column(DataType.DECIMAL(10, 2))
  tip!: number

  @AllowNull(false)
  @Default('cash')
  @Column(DataType.ENUM('cash', 'percent'))
  tipType!: TipType

  @AllowNull(false)
  @Default(0)
  @Column(DataType.DECIMAL(10, 2))
  fee!: number

  @AllowNull(false)
  @Column(DataType.STRING(255))
  streetAddress!: string;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.STRING(255))
  streetAddress2!: string;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  city!: string;

  @AllowNull(false)
  @Column(DataType.STRING(25))
  state!: string;

  @AllowNull(false)
  @Column(DataType.STRING(10))
  zip!: string;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.STRING(255))
  country!: string;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  checkoutTokenId!: string;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.STRING(255))
  checkoutChargeId!: string;

  @AllowNull(false)
  @Default('pending')
  @Column(DataType.ENUM('pending', 'processing', 'paid', 'postponed', 'error'))
  status!: PaidStatus;

  @Column(DataType.DATE)
  createdAt!: Date;

  @Column(DataType.DATE)
  updatedAt!: Date;

  get fullName() {
    return `${this.firstName} ${this.lastName}`
  }

  get zeroMoney() {
    return newDinero(0, this.currency)
  }

  get amountMoney() {
    return newDinero(this.amount * 100, this.currency)
  }

  get tipAmountMoney() {
    if (!this.tip) {
      return this.zeroMoney;
    }

    if (this.tipType === TipType.Cash) {
      return newDinero(this.tip * 100, this.currency)
    }

    return this.amountMoney.multiply(this.tip / 100)
  }

  get chargeAmountMoney() {
    return this.amountMoney.add(this.tipAmountMoney)
  }
}
