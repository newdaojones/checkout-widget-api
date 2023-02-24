import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
export class CheckoutType {
  @Field(() => ID)
  id: number;

  @Field()
  firstName: string;

  @Field()
  lastName: string;
}