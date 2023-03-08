import { Model, Table, Column, PrimaryKey, AllowNull, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Checkout } from './Checkout';

@Table
export class FundsTransfer extends Model<FundsTransfer> {
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
  @Column(DataType.DECIMAL(10, 2))
  amount!: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  amountExcepted!: number;

  @AllowNull(false)
  @Column(DataType.STRING(10))
  currencyType!: string

  @AllowNull(true)
  @Default(null)
  @Column(DataType.DATE)
  cancelledAt!: Date

  @AllowNull(true)
  @Default(null)
  @Column(DataType.TEXT)
  cancellationDetails!: string

  @AllowNull(true)
  @Default(null)
  @Column(DataType.DATE)
  clearsOn!: Date

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
  @Column(DataType.STRING(255))
  equalityHash!: string

  @AllowNull(true)
  @Default(null)
  @Column(DataType.STRING(255))
  fundsSourceName!: string

  @AllowNull(true)
  @Default(null)
  @Column(DataType.STRING(255))
  fundsTransferType!: string

  @AllowNull(true)
  @Default(null)
  @Column(DataType.STRING(255))
  nachaIndividualId!: string

  @AllowNull(true)
  @Default(null)
  @Column(DataType.STRING(255))
  privateMemo!: string

  @AllowNull(true)
  @Default(null)
  @Column(DataType.STRING(255))
  receivedChargeBack!: string

  @AllowNull(true)
  @Default(null)
  @Column(DataType.STRING(255))
  receiverName!: string

  @AllowNull(true)
  @Default(null)
  @Column(DataType.STRING(255))
  reference!: string

  @AllowNull(true)
  @Default(null)
  @Column(DataType.TEXT)
  reviewReasons!: string

  @AllowNull(false)
  @Default(0)
  @Column(DataType.DECIMAL(10, 2))
  reversedAmount!: number;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.TEXT)
  reversalDetails!: string

  @AllowNull(true)
  @Default(null)
  @Column(DataType.DATE)
  reversedAt!: Date

  @AllowNull(true)
  @Default(null)
  @Column(DataType.DATE)
  settledAt!: Date

  @AllowNull(true)
  @Default(null)
  @Column(DataType.TEXT)
  settlementDetails!: string

  @AllowNull(true)
  @Default(null)
  @Column(DataType.STRING(255))
  signetDepositAddress!: string

  @AllowNull(true)
  @Default(null)
  @Column(DataType.TEXT)
  specialInstructions!: string

  @AllowNull(true)
  @Default(null)
  @Column(DataType.STRING(255))
  specialType!: string

  @AllowNull(true)
  @Default(null)
  @Column(DataType.TEXT)
  wireInstructions!: string

  @AllowNull(true)
  @Default(null)
  @Column(DataType.TEXT)
  wireInstructionsIntl!: string

  @AllowNull(true)
  @Default(null)
  @Column(DataType.TEXT)
  altCurrencyWireInstructions!: string

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
