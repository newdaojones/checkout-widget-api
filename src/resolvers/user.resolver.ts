import { Resolver, Query, Arg, Mutation, Subscription, Root, Authorized, Ctx } from 'type-graphql';
import { log } from '../utils';
import { UserVerifyType } from '../types/userVerify.type';
import { UserType } from '../types/user.type';
import { UserInputType } from '../types/user-input.type';
import { NotificationType } from '../services/notificationService';
import { Config } from '../config';
import { PrimeTrustService } from '../services/primeTrust';
import { User } from '../models/User';

const primeTrust = PrimeTrustService.getInstance()

@Resolver()
export class UserResolver {
  @Query(() => UserType)
  @Authorized()
  async me(
    @Ctx('user') user: any
  ) {
    return User.findByPk(user.id);
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

    const res = await primeTrust.createCustodialAccount(data)
    const userId = res.data.id;


    const contact = await res.included?.find((entity) => entity.type === 'contacts');

    if (!contact) {
      throw new Error(`Can\'t find a contact for user ${res.data.id}`)
    }

    const user = await User.create({
      id: res.data.id,
      contactId: contact.id,
      status: res.data.attributes.status,
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
      deviceId: data.deviceId,
      documentId: data.documentId
    })

    if (!Config.isProduction) {
      await primeTrust.sandboxOpenAccount(res.data.id)
      await primeTrust.createAccountPolicySandbox(userId)
    }

    return user
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
