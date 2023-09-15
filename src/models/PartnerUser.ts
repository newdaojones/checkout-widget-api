import {
  Model,
  Table,
  Column,
  PrimaryKey,
  AllowNull,
  DataType,
  BelongsTo,
  ForeignKey,
} from "sequelize-typescript";
import { UserService } from "../services/userService";
import { UserStatus } from "../types/userStatus.type";
import axios from "axios";
import { log } from "../utils";
import { User } from "./User";
import { Partner } from "./Partner";

@Table({
  tableName: "partnerUsers",
  name: {
    singular: "partnerUser",
    plural: "partnerUsers",
  },
})
export class PartnerUser extends Model<PartnerUser> {
  @PrimaryKey
  @ForeignKey(() => Partner)
  @AllowNull(false)
  @Column(DataType.UUID)
  partnerId!: string;

  @PrimaryKey
  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.UUID)
  userId!: string;

  @Column(DataType.DATE)
  createdAt!: Date;

  @Column(DataType.DATE)
  updatedAt!: Date;

  @BelongsTo(() => User)
  user!: User;
  getUser!: () => Promise<User>;

  @BelongsTo(() => Partner)
  partner!: Partner;
  getPartner!: () => Promise<Partner>;
}
