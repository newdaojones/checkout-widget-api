import { PubSubEngine } from "type-graphql";
import Container, { Service } from "typedi";
import { log } from "../utils";
import { UserVerifyType } from "../types/userVerify.type";
import { TransactionType } from "../types/transaction.type";
import { SubscriptionType } from "../types/subscription.type";

const pubsubEngine = Container.get<PubSubEngine>("pubsub");

export enum NotificationType {
  TRANSACTION_STATUS = "TRANSACTION_STATUS",
  ACCOUNT_STATUS = "ACCOUNT_STATUS",
  SUBSCRIPTION = "SUBSCRIPTION",
}

export class NotificationService {
  constructor(private readonly pubSub: PubSubEngine) {}

  static getInstance() {
    return new NotificationService(pubsubEngine);
  }

  async publishTransactionStatus(payload: TransactionType) {
    try {
      if (!this.pubSub) {
        throw new Error("Subscription is not initialized");
      }

      this.pubSub.publish(NotificationType.TRANSACTION_STATUS, payload);
    } catch (err) {
      log.warn({
        func: "publishTransaction",
        checkoutId: payload.checkoutId,
        payload,
        err,
      });
    }
  }

  async publishUserStatus(payload: UserVerifyType) {
    try {
      if (!this.pubSub) {
        throw new Error("Subscription is not initialized");
      }

      this.pubSub.publish(NotificationType.ACCOUNT_STATUS, payload);
    } catch (err) {
      log.warn({
        func: "publishTransaction",
        userId: payload.userId,
        payload,
        err,
      });
    }
  }

  async publishSubscription(payload: SubscriptionType) {
    try {
      if (!this.pubSub) {
        throw new Error("Subscription is not initialized");
      }

      this.pubSub.publish(NotificationType.SUBSCRIPTION, payload);
    } catch (err) {
      log.warn({
        func: "publishSubscription",
        payload,
        err,
      });
    }
  }
}
