import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
export class CheckoutRequestType {
  @Field(() => ID)
  id: number;

  @Field({ nullable: true })
  partnerOrderId!: string;

  @Field()
  walletAddress: string;

  @Field({ nullable: true })
  email!: string;

  @Field()
  phoneNumber: string;

  @Field()
  amount: number;

  @Field()
  status: string;

  @Field({ nullable: true })
  webhook!: string;

  @Field({ nullable: true })
  createdAt: Date;

  @Field({ nullable: true })
  updatedAt: Date;
}