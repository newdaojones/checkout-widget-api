import { Model, Table, Column, PrimaryKey, AllowNull, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Checkout } from './Checkout';

@Table
export class AssetTransfer extends Model<AssetTransfer> {
  @PrimaryKey
  @AllowNull(false)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(false)
  @Column(DataType.UUID)
  disbursementAuthorizationId!: string;

  @ForeignKey(() => Checkout)
  @AllowNull(false)
  @Column(DataType.UUID)
  checkoutId!: string;

  @AllowNull(false)
  @Column(DataType.STRING(50))
  status!: string;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 10))
  unitCount!: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 10))
  unitCountExpected!: number;

  @AllowNull(true)
  @Column(DataType.STRING(255))
  @Default(null)
  transactionHash!: string

  @AllowNull(true)
  @Column(DataType.TEXT)
  @Default(null)
  settlementDetails!: string

  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  @Default(false)
  hotTransfer!: boolean;

  @AllowNull(true)
  @Column(DataType.STRING(255))
  @Default(null)
  chargeAccountId!: string

  @AllowNull(true)
  @Column(DataType.DATE)
  @Default(null)
  cancelledAt!: Date

  @AllowNull(true)
  @Column(DataType.DATE)
  @Default(null)
  contingenciesClearedAt!: Date

  @AllowNull(true)
  @Column(DataType.DATE)
  @Default(null)
  contingenciesClearedOn!: Date

  @AllowNull(true)
  @Column(DataType.DATE)
  @Default(null)
  reconciledAt!: Date

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
