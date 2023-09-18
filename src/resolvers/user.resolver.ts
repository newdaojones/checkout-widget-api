import { v4 as uuidv4 } from "uuid";
import {
  Resolver,
  Query,
  Arg,
  Mutation,
  Subscription,
  Root,
  Authorized,
  Ctx,
} from "type-graphql";
import { log } from "../utils";
import { UserVerifyType } from "../types/userVerify.type";
import { UserType } from "../types/user.type";
import { UserInputType } from "../types/user-input.type";
import { NotificationType } from "../services/notificationService";
import { User } from "../models/User";
import { BridgeService } from "../services/bridgeService";
import { AgreementLink } from "../models/AgreementLink";
import { KycLink } from "../models/KycLink";
import { UserService } from "../services/userService";
import { Config } from "../config";
import { UserStatus } from "../types/userStatus.type";
import { TosStatus } from "../types/tosStatus.type";

const bridgeService = BridgeService.getInstance();

const syncUser = async (user: User) => {
  const res = await bridgeService.getCustomer(user.id);

  await user.update({
    status: res.status,
    requirementsDue: res.requirements_due,
    futureRequirementsDue: res.future_requirements_due,
  });
};

@Resolver()
export class UserResolver {
  @Query(() => UserType)
  @Authorized()
  async me(@Ctx("user") user: any) {
    const userRecord = await User.findByPk(user.id);

    if (!userRecord.isVerified) {
      await syncUser(userRecord);
    }

    return userRecord;
  }

  @Query(() => String)
  async agreementLink() {
    const idempotenceId = uuidv4();

    const link = await bridgeService.createTermsOfServiceUrl(idempotenceId);

    await AgreementLink.create({
      id: idempotenceId,
      link,
    });

    return link;
  }

  @Mutation(() => UserType)
  async createUser(@Arg("data") data: UserInputType) {
    log.info({
      func: "createUser",
      data,
    });

    const existingUserEmail = await User.findOne({
      where: {
        email: data.email,
      },
    });

    if (existingUserEmail) {
      throw new Error(`Already exists account with email: ${data.email}`);
    }

    const existingUserPhoneNumber = await User.findOne({
      where: {
        phoneNumber: data.phoneNumber,
      },
    });

    if (existingUserPhoneNumber) {
      throw new Error(
        `Already exists account with phone number: ${data.email}`
      );
    }

    const idempotenceId = uuidv4();

    const res = await bridgeService.createCustomer(
      {
        type: "individual",
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phoneNumber,
        address: {
          street_line_1: data.streetAddress,
          street_line_2: data.streetAddress2,
          city: data.city,
          state: data.state,
          postal_code: data.postalCode,
          country: data.country,
        },
        dob: data.dob,
        ssn: data.ssn,
        signed_agreement_id: data.signedAgreementId,
      },
      idempotenceId
    );

    const user = await User.create({
      id: res.id,
      status: res.status,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phoneNumber: data.phoneNumber,
      gender: data.gender,
      dob: data.dob,
      ssn: data.ssn,
      password: data.password,
      streetAddress: data.streetAddress,
      streetAddress2: data.streetAddress2,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      country: data.country,
      requirementsDue: res.requirements_due,
      futureRequirementsDue: res.future_requirements_due,
      signedAgreementId: data.signedAgreementId,
      idempotenceId,
    });

    const token = UserService.generateJWTToken({
      id: user.id,
      email: user.email,
    });

    return {
      ...user.toJSON(),
      isVerified: user.isVerified,
      token,
    };
  }

  @Authorized()
  @Query(() => String)
  async kycLink(@Ctx("user") user: User) {
    if (Config.isProduction) {
      const link = await bridgeService.createKycUrl(
        user.id,
        `${Config.frontendUri}/kyc-success`
      );

      await KycLink.create({
        userId: user.id,
        associatedObjectType: "user",
        associatedUserType: "user",
        email: user.email,
        customerId: user.id,
        kycLink: link,
        tosStatus: TosStatus.Approved,
      });

      return link;
    } else {
      return `${Config.frontendUri}/kyc-success`;
    }
  }

  @Authorized()
  @Mutation(() => Boolean)
  async keyCompleted(@Ctx("user") user: User) {
    const userRecord = await User.findByPk(user.id);

    if (!Config.isProduction) {
      await userRecord.update({
        status: UserStatus.Active,
        requirementsDue: [],
        futureRequirementsDue: [],
      });
    } else {
      await syncUser(userRecord);
    }

    return true;
  }

  @Subscription({
    topics: NotificationType.ACCOUNT_STATUS,
    filter: ({ payload, args }) => {
      console.log("===================", payload);
      return !!payload && payload.userId === args.userId;
    },
  })
  userVerify(
    @Root() messagePayload: UserVerifyType,
    @Arg("userId") userId: string
  ): UserVerifyType {
    return messagePayload;
  }
}
