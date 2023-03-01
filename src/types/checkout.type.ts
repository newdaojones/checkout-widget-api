import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
export class CheckoutType {
  @Field(() => ID)
  id: number;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field()
  email: string;

  @Field()
  phoneNumber: string;

  @Field()
  currency: string;

  @Field()
  amount: number;

  @Field()
  fee: number;

  @Field()
  tip: number;

  @Field()
  tipType: number;

  @Field()
  streetAddress: string;

  @Field({ nullable: true })
  streetAddress2: string;

  @Field()
  city: string;

  @Field()
  state: string;

  @Field()
  zip: string;

  @Field({ nullable: true })
  country: string;

  @Field({ nullable: true })
  checkoutChargeId: string;

  @Field({ nullable: true })
  checkoutStatus: string;

  @Field({ nullable: true })
  checkoutPaidAt: Date;

  @Field({ nullable: true })
  primeTrustId: string;

  @Field({ nullable: true })
  primeTrustStatus: string;

  @Field({ nullable: true })
  primeTrustPaidAt: Date;

  @Field({ nullable: true })
  createdAt: Date;

  @Field({ nullable: true })
  updatedAt: Date;
}