import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
export class UserType {
  @Field(() => ID)
  id: number;

  @Field({ nullable: true })
  contactId!: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field()
  email: string;

  @Field()
  phoneNumber: string;

  @Field({ nullable: true })
  gender!: string;

  @Field({ nullable: true })
  dob!: string;

  @Field({ nullable: true })
  taxId!: string;

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

  @Field()
  identityConfirmed: boolean;

  @Field()
  identityDocumentsVerified: boolean;

  @Field()
  proofOfAddressDocumentsVerified: boolean;

  @Field()
  amlCleared: boolean;

  @Field()
  cipCleared: boolean;

  @Field({ nullable: true })
  createdAt: Date;

  @Field({ nullable: true })
  updatedAt: Date;
}