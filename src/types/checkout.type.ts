import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
export class CheckoutType {
  @Field(() => ID)
  id: number;

  @Field()
  walletAddress: string;

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
  feeType: string;

  @Field()
  tip: number;

  @Field()
  tipType: string;

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
  createdAt: Date;

  @Field({ nullable: true })
  updatedAt: Date;
}