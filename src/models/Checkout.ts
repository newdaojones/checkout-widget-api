import { Model, Table, Column, PrimaryKey, AutoIncrement, AllowNull, DataType, Default } from 'sequelize-typescript';

@Table
export class Checkout extends Model<Checkout> {
  @PrimaryKey
  @AutoIncrement
  @AllowNull(false)
  @Column(DataType.INTEGER.UNSIGNED)
  id!: number;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  firstName!: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  lastName!: string;

  @AllowNull(false)
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

  @AllowNull(true)
  @Default(null)
  @Column(DataType.STRING(255))
  checkoutChargeId!: string;

  @AllowNull(false)
  @Default('processing')
  @Column(DataType.ENUM('processing', 'paid', 'postponed', 'error'))
  checkoutStatus!: string;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.DATE)
  checkoutPaidAt!: Date;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.STRING(255))
  primeTrustId!: string;

  @AllowNull(false)
  @Default('postponed')
  @Column(DataType.ENUM('processing', 'paid', 'postponed', 'error'))
  primeTrustStatus!: string;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.DATE)
  primeTrustPaidAt!: Date;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.JSON)
  logs!: any;

  @Column(DataType.DATE)
  createdAt!: Date;

  @Column(DataType.DATE)
  updatedAt!: Date;
}
