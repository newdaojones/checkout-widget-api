import {
  Model,
  Table,
  Column,
  PrimaryKey,
  AllowNull,
  DataType,
  Default,
  IsEmail,
  BeforeUpdate,
  BeforeCreate
} from 'sequelize-typescript';
import { UserService } from '../services/userService';

@Table({
  tableName: 'partners',
  name: {
    singular: 'partner',
    plural: 'partners'
  }
})

export class Partner extends Model<Partner> {
  @PrimaryKey
  @AllowNull(false)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.UUID)
  userId!: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  companyName!: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  firstName!: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  lastName!: string;

  @AllowNull(false)
  @IsEmail
  @Column(DataType.STRING(100))
  email!: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  password: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  phoneNumber!: string;

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
  @Column(DataType.TEXT)
  webhook!: string;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isApproved!: boolean;

  @Column(DataType.DATE)
  createdAt!: Date;

  @Column(DataType.DATE)
  updatedAt!: Date;

  //#region Associations
  //#endregion

  @BeforeUpdate
  @BeforeCreate
  static async beforeSaveHook(partner: Partner, options: any) {
    if (partner.password && partner.changed('password')) {
      const hashedPw = await UserService.encryptPassword(partner.password);
      partner.password = hashedPw as string;
    }
  }

  static async findPartner(email: string, password: string) {
    const partner = await this.findOne({
      where: { email },
    });

    if (partner == null || partner.password == null || partner.password.length === 0) {
      new Error('Invalid email or password')
    }

    const isPasswordMatch = await UserService.comparePassword(password, partner.password);

    if (!isPasswordMatch) {
      new Error('Invalid email or password')
    }

    return partner
  }
}
