import {
  Arg,
  Args,
  Mutation,
  Resolver,
  Root,
  Subscription,
} from "type-graphql";

import {
  NotificationService,
  NotificationType,
} from "../services/notificationService";
import { SubscriptionType } from "../types/subscription.type";
import { SubscriptionArgs } from "../types/subscription.args";

const notificationService = NotificationService.getInstance();

@Resolver()
export class SubscriptionResolver {
  @Mutation(() => SubscriptionType)
  async publishSubscription(@Args() data: SubscriptionArgs) {
    await notificationService.publishSubscription(data);
    return true;
  }

  @Subscription({
    topics: NotificationType.SUBSCRIPTION,
    filter: ({ payload, args }) => {
      return !!payload && payload.id === args.id && payload.type === args.type;
    },
  })
  subscription(
    @Root() messagePayload: SubscriptionType,
    @Arg("id") id: string,
    @Arg("type") type: string
  ): SubscriptionType {
    return messagePayload;
  }
}
