import {
  Model,
  Table,
  Column,
  PrimaryKey,
  AllowNull,
  DataType,
  Default,
  IsEmail
} from 'sequelize-typescript';

@Table({
  tableName: 'cipChecks',
  name: {
    singular: 'cipCheck',
    plural: 'cipChecks'
  }
})

export class CipCheck extends Model<CipCheck> { 
  @PrimaryKey
  @AllowNull(false)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(false)
  @Column(DataType.UUID)
  userId!: string;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.UUID)
  socureReferenceId!: string;

  @AllowNull(false)
  @Column(DataType.STRING(50))
  status!: string;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  submitForReview!: boolean;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.JSON)
  exceptions!: any;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.TEXT)
  exceptionDetails!: string;

  @Column(DataType.DATE)
  createdAt!: Date;

  @Column(DataType.DATE)
  updatedAt!: Date;
}
