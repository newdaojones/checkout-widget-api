import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
export class UserType {
  @Field(() => ID)
  id: number;

  @Field()
  firstName: string;

  @Field()
  lastName: string;
}