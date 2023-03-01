import { Field, InputType } from "type-graphql";
import { TipType } from "./tip.type";

@InputType()
export class CheckoutInputType {
  @Field()
  checkoutTokenId: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field()
  email: string;

  @Field()
  phoneNumber: string;

  @Field()
  amount: number;

  @Field()
  tip: number;

  @Field()
  tipType: TipType;

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
}