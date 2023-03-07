import { Model, Table, Column, PrimaryKey, AllowNull, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Checkout } from './Checkout';

@Table
export class AssetQuote extends Model<AssetQuote> {
  @PrimaryKey
  @AllowNull(false)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => Checkout)
  @AllowNull(false)
  @Column(DataType.UUID)
  checkoutId!: string;

  @AllowNull(false)
  @Column(DataType.STRING(50))
  status!: string;

  @AllowNull(false)
  @Column(DataType.STRING(50))
  assetName!: string;

  @AllowNull(false)
  @Column(DataType.STRING(50))
  transactionType!: string;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  baseAmount!: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  feeAmount!: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  totalAmount!: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 10))
  pricePerUnit!: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 10))
  unitCount!: number;

  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  @Default(false)
  hot!: boolean;

  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  @Default(false)
  delayedSettlement!: boolean;

  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  @Default(false)
  integratorSettled!: boolean;

  @AllowNull(true)
  @Column(DataType.DATE)
  @Default(null)
  executedAt!: Date;

  @AllowNull(true)
  @Column(DataType.DATE)
  @Default(null)
  expiresAt!: Date;

  @AllowNull(true)
  @Column(DataType.DATE)
  @Default(null)
  rejectedAt!: Date;

  @AllowNull(true)
  @Column(DataType.DATE)
  @Default(null)
  settledAt!: Date;

  @Column(DataType.DATE)
  createdAt!: Date;

  @Column(DataType.DATE)
  updatedAt!: Date;

  //#region Associations

  @BelongsTo(() => Checkout)
  checkout!: Checkout;
  getCheckout!: () => Promise<Checkout>;
  setCheckout!: (caller: Checkout) => void;
  
  //#endregion
}
