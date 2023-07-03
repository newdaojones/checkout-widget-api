import { v4 as uuidv4 } from 'uuid';
import { Resolver, Query, Arg, Mutation, Subscription, Root, Authorized, Ctx } from 'type-graphql';
import { log } from '../utils';
import { UserVerifyType } from '../types/userVerify.type';
import { UserType } from '../types/user.type';
import { UserInputType } from '../types/user-input.type';
import { NotificationType } from '../services/notificationService';
import { User } from '../models/User';
import { BridgeService } from '../services/bridgeService';
import { AgreementLink } from '../models/agreementLinks';
import { KycLink } from '../models/KycLink';

const bridgeService = BridgeService.getInstance()

@Resolver()
export class UserResolver {
  @Query(() => UserType)
  @Authorized()
  async me(
    @Ctx('user') user: any
  ) {
    return User.findByPk(user.id);
  }

  @Query(() => String)
  async agreementLink() {
    const idempotenceId = uuidv4()

    const link = await bridgeService.createTermsOfServiceUrl(idempotenceId)

    await AgreementLink.create({
      id: idempotenceId,
      link
    })

    return link
  }

  @Mutation(() => UserType)
  async createUser(
    @Arg('data') data: UserInputType,
  ) {
    log.info({
      func: 'createUser',
      data
    })

    const existingUser = await User.findOne({
      where: {
        email: data.email
      }
    })

    if (existingUser) {
      throw new Error(`Already exists account with email: ${data.email}`)
    }

    const idempotenceId = uuidv4()

    const res = await bridgeService.createCustomer({
      type: 'individual',
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phoneNumber,
      address: {
        street_line_1: data.streetAddress,
        street_line_2: data.streetAddress2,
        city: data.city,
        state: data.state,
        postal_code: data.zip,
        country: data.country
      },
      dob: data.dob,
      ssn: data.taxId,
      signed_agreement_id: data.signedAgreementId
    }, idempotenceId)

    const user = await User.create({
      id: res.id,
      status: res.status,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phoneNumber: data.phoneNumber,
      gender: data.gender,
      dob: data.dob,
      taxId: data.taxId,
      password: data.password,
      streetAddress: data.streetAddress,
      streetAddress2: data.streetAddress2,
      city: data.city,
      state: data.state,
      zip: data.zip,
      country: data.country,
      requirementsDue: res.requirements_due,
      futureRequirementsDue: res.future_requirements_due,
      signedAgreementId: data.signedAgreementId,
      idempotenceId
    })

    return user
  }

  @Authorized()
  @Query(() => String)
  async kycLink(
    @Ctx('user') user: User
  ) {
    const link = await bridgeService.createTermsOfServiceUrl(user.id)

    await KycLink.create({
      link,
      userId: user.id
    })

    return link
  }

  @Subscription({
    topics: NotificationType.ACCOUNT_STATUS,
    filter: ({ payload, args }) => {
      return !!payload && payload.userId === args.userId;
    }
  })
  userVerify(
    @Root() messagePayload: UserVerifyType,
    @Arg('userId') userId: string,
  ): UserVerifyType {
    return messagePayload;
  }
}
