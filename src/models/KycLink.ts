import {
  Model,
  Table,
  Column,
  PrimaryKey,
  AllowNull,
  DataType,
  ForeignKey,
  Default
} from 'sequelize-typescript';
import { User } from './User';

@Table({
  tableName: 'kycLinks',
  name: {
    singular: 'kycLink',
    plural: 'kycLinks'
  }
})

export class KycLink extends Model<KycLink> {
  @PrimaryKey
  @AllowNull(false)
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.UUID)
  userId!: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  link!: string;

  @Column(DataType.DATE)
  createdAt!: Date;

  @Column(DataType.DATE)
  updatedAt!: Date;
}
