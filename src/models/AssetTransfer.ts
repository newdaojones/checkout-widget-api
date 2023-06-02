import { Model, Table, Column, PrimaryKey, AllowNull, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Checkout } from './Checkout';

@Table({
  tableName: 'assetTransfers',
  name: {
    singular: 'assetTransfer',
    plural: 'assetTransfers'
  }
})
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
  @Column(DataType.DECIMAL(10, 5))
  unitCount!: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 5))
  unitCountExpected!: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 5))
  fee!: number;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.STRING(255))
  transactionHash!: string

  @AllowNull(true)
  @Default(null)
  @Column(DataType.TEXT)
  settlementDetails!: string

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  hotTransfer!: boolean;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.STRING(255))
  chargeAccountId!: string

  @AllowNull(true)
  @Default(null)
  @Column(DataType.DATE)
  cancelledAt!: Date

  @AllowNull(true)
  @Default(null)
  @Column(DataType.DATE)
  contingenciesClearedAt!: Date

  @AllowNull(true)
  @Default(null)
  @Column(DataType.DATE)
  contingenciesClearedOn!: Date

  @AllowNull(true)
  @Default(null)
  @Column(DataType.DATE)
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
