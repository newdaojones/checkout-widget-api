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
  tableName: 'users',
  name: {
    singular: 'user',
    plural: 'users'
  }
})

export class User extends Model<User> { 
  @PrimaryKey
  @AllowNull(false)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(false)
  @Column(DataType.UUID)
  contactId!: string;

  @AllowNull(false)
  @Column(DataType.STRING(50))
  status!: string // 'pending', 'opened'

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

  @AllowNull(true)
  @Default(null)
  @Column(DataType.STRING(20))
  gender!: string;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.STRING(20))
  dob!: string;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.STRING(100))
  taxId!: string;

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

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  identityConfirmed!: boolean;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  identityDocumentsVerified!: boolean;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  proofOfAddressDocumentsVerified!: boolean;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  amlCleared!: boolean;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  cipCleared!: boolean;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.TEXT)
  documentId!: string;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.TEXT)
  deviceId!: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  token: string;

  @Column(DataType.DATE)
  createdAt!: Date;

  @Column(DataType.DATE)
  updatedAt!: Date;

   //#region Associations
   //#endregion

  get fullName() {
    return `${this.firstName} ${this.lastName}`
  }

  get isVerified() {
    return this.identityConfirmed &&
      this.amlCleared &&
      this.cipCleared &&
      this.status === 'opened'
  }

  @BeforeUpdate
  @BeforeCreate
  static async beforeSaveHook(user: User, options: any) {
    if (user.password && user.changed('password')) {
      const hashedPw = await UserService.encryptPassword(user.password);
      user.password = hashedPw as string;
    }
  }

  static async findUser(email: string, password: string, cb: Function) {
    try {
      const user = await this.findOne({
        where: { email },
      });

      if (user == null || user.password == null || user.password.length === 0) {
        cb(new Error('Invalid email or password'), null);
        return;
      }

      const isPasswordMatch = await UserService.comparePassword(password, user.password);
      if (isPasswordMatch) {
        return cb(null, user);
      }

      cb(new Error('Invalid email or password'), null);

    } catch (err: any) {
      cb(err, null);
    }
  }
}
