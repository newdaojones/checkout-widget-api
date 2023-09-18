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
import { log } from "../utils";

const notificationService = NotificationService.getInstance();

@Resolver()
export class SubscriptionResolver {
  @Mutation(() => Boolean)
  async publishSubscription(@Args() data: SubscriptionArgs) {
    log.info(
      {
        func: "publishSubscription",
        data,
      },
      "Publish subscription"
    );
    try {
      await notificationService.publishSubscription(data);
      return true;
    } catch (err) {
      log.warn(
        {
          func: "publishSubscription",
          data,
          err,
        },
        "Failed publish subscription"
      );

      return false;
    }
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
