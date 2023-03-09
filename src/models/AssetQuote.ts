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
  @Column(DataType.DECIMAL(10, 5))
  pricePerUnit!: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 5))
  unitCount!: number;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  hot!: boolean;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  delayedSettlement!: boolean;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  integratorSettled!: boolean;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.DATE)
  executedAt!: Date;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.DATE)
  expiresAt!: Date;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.DATE)
  rejectedAt!: Date;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.DATE)
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
