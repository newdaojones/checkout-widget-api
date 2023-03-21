import { Model, Table, Column, PrimaryKey, AutoIncrement, AllowNull, DataType, Default, IsEmail } from 'sequelize-typescript';

@Table({
  tableName: 'primeTrustAccounts',
  name: {
    singular: 'primeTrustAccount',
    plural: 'primeTrustAccounts'
  }
})
export class PrimeTrustAccount extends Model<PrimeTrustAccount> {
  @PrimaryKey
  @AutoIncrement
  @AllowNull(false)
  @Column(DataType.INTEGER.UNSIGNED)
  id!: number;

  @AllowNull(false)
  @IsEmail
  @Column(DataType.STRING(100))
  email!: string;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.TEXT)
  token!: string;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.DATE)
  expiresAt!: Date;

  @Column(DataType.DATE)
  createdAt!: Date;

  @Column(DataType.DATE)
  updatedAt!: Date;
}
