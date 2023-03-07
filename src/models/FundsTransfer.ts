import { Model, Table, Column, PrimaryKey, AllowNull, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Checkout } from './Checkout';

@Table
export class FundsTransfer extends Model<FundsTransfer> {
  @PrimaryKey
  @AllowNull(false)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(false)
  @Column(DataType.UUID)
  contingentHoldId!: string;

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
  @Column(DataType.DATE)
  @Default(null)
  cancelledAt!: Date

  @AllowNull(true)
  @Column(DataType.TEXT)
  @Default(null)
  cancellationDetails!: string

  @AllowNull(true)
  @Column(DataType.DATE)
  @Default(null)
  clearsOn!: Date

  @AllowNull(true)
  @Column(DataType.DATE)
  @Default(null)
  contingenciesClearedAt!: Date

  @AllowNull(true)
  @Column(DataType.DATE)
  @Default(null)
  contingenciesClearedOn!: Date

  @AllowNull(true)
  @Column(DataType.STRING(255))
  @Default(null)
  equalityHash!: string

  @AllowNull(true)
  @Column(DataType.STRING(255))
  @Default(null)
  fundsSourceName!: string

  @AllowNull(true)
  @Column(DataType.STRING(255))
  @Default(null)
  fundsTransferType!: string

  @AllowNull(true)
  @Column(DataType.STRING(255))
  @Default(null)
  nachaIndividualId!: string

  @AllowNull(true)
  @Column(DataType.STRING(255))
  @Default(null)
  privateMemo!: string

  @AllowNull(true)
  @Column(DataType.STRING(255))
  @Default(null)
  receivedChargeBack!: string

  @AllowNull(true)
  @Column(DataType.STRING(255))
  @Default(null)
  receiverName!: string

  @AllowNull(true)
  @Column(DataType.STRING(255))
  @Default(null)
  reference!: string

  @AllowNull(true)
  @Column(DataType.TEXT)
  @Default(null)
  reviewReasons!: string

  @AllowNull(false)
  @Default(0)
  @Column(DataType.DECIMAL(10, 2))
  reversedAmount!: number;

  @AllowNull(true)
  @Column(DataType.TEXT)
  @Default(null)
  reversedReasons!: string

  @AllowNull(true)
  @Column(DataType.TEXT)
  @Default(null)
  reversalDetails!: string

  @AllowNull(true)
  @Column(DataType.DATE)
  @Default(null)
  reversedAt!: Date

  @AllowNull(true)
  @Column(DataType.DATE)
  @Default(null)
  settledAt!: Date

  @AllowNull(true)
  @Column(DataType.TEXT)
  @Default(null)
  settlementDetails!: string

  @AllowNull(true)
  @Column(DataType.STRING(255))
  @Default(null)
  signetDepositAddress!: string

  @AllowNull(true)
  @Column(DataType.TEXT)
  @Default(null)
  specialInstructions!: string

  @AllowNull(true)
  @Column(DataType.STRING(255))
  @Default(null)
  specialType!: string

  @AllowNull(true)
  @Column(DataType.TEXT)
  @Default(null)
  wireInstructions!: string

  @AllowNull(true)
  @Column(DataType.TEXT)
  @Default(null)
  wireInstructionsIntl!: string

  @AllowNull(true)
  @Column(DataType.TEXT)
  @Default(null)
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
