import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
export class CheckoutRequestType {
  @Field(() => ID)
  id: number;

  @Field()
  walletAddress: string;

  @Field()
  email: string;

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