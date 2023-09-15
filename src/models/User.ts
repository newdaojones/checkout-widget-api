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
  BeforeCreate,
  BelongsTo,
  HasOne,
  BelongsToMany,
} from "sequelize-typescript";
import { UserService } from "../services/userService";
import { UserStatus } from "../types/userStatus.type";
import { Partner } from "./Partner";
import { PartnerUser } from "./PartnerUser";

@Table({
  tableName: "users",
  name: {
    singular: "user",
    plural: "users",
  },
})
export class User extends Model<User> {
  @PrimaryKey
  @AllowNull(false)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(false)
  @Default(UserStatus.Pending)
  @Column(DataType.ENUM(...Object.values(UserStatus)))
  status!: UserStatus;

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

  @AllowNull(false)
  @Column(DataType.TEXT)
  password: string;

  @AllowNull(true)
  @Default(null)
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
  ssn!: string;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.STRING(255))
  streetAddress!: string;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.STRING(255))
  streetAddress2!: string;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.STRING(255))
  city!: string;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.STRING(25))
  state!: string;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.STRING(10))
  postalCode!: string;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.STRING(255))
  country!: string;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.JSON)
  requirementsDue!: string[];

  @AllowNull(true)
  @Default(null)
  @Column(DataType.JSON)
  futureRequirementsDue!: string[];

  @AllowNull(true)
  @Default(null)
  @Column(DataType.STRING)
  signedAgreementId!: string;

  @AllowNull(true)
  @Default(null)
  @Column(DataType.STRING)
  idempotenceId!: string;

  @Column(DataType.DATE)
  createdAt!: Date;

  @Column(DataType.DATE)
  updatedAt!: Date;

  @BelongsToMany(() => Partner, () => PartnerUser)
  partners!: Partner[];
  getPartners!: () => Promise<Partner[]>;

  @HasOne(() => PartnerUser)
  partnerUser!: PartnerUser;
  getPartnerUser!: () => Promise<PartnerUser>;

  //#region Associations
  //#endregion

  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  get isVerified() {
    return (
      this.status === UserStatus.Active && !this.futureRequirementsDue?.length
    );
  }

  get isRejected() {
    return (this.status = UserStatus.Rejected);
  }

  @BeforeUpdate
  @BeforeCreate
  static async beforeSaveHook(user: User, options: any) {
    if (user.password && user.changed("password")) {
      const hashedPw = await UserService.encryptPassword(user.password);
      user.password = hashedPw as string;
    }
  }

  static async findUser(email: string, password: string, cb?: Function) {
    try {
      const user = await this.findOne({
        where: { email },
      });

      if (user == null || user.password == null || user.password.length === 0) {
        cb(new Error("Invalid email or password"), null);
        return;
      }

      const isPasswordMatch = await UserService.comparePassword(
        password,
        user.password
      );

      if (!isPasswordMatch) {
        if (cb) {
          return cb(null, user);
        }

        return user;
      }

      if (cb) {
        return cb(new Error("Invalid email or password"), null);
      }

      new Error("Invalid email or password");
    } catch (err: any) {
      if (cb) {
        return cb(err, null);
      }

      throw err;
    }
  }

  async getPartner() {
    return Partner.findOne({
      include: {
        model: PartnerUser,
        where: {
          userId: this.id,
        },
      },
    });
  }
}
