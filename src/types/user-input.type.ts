import { IsNumber, isNumber, IsOptional, IsString } from "class-validator";
import { Field, InputType } from "type-graphql";
import { TipType } from "./tip.type";

@InputType()
export class UserInputType {
  @IsString()
  @Field()
  firstName: string;

  @IsString()
  @Field()
  lastName: string;

  @IsString()
  @Field()
  email: string;

  @IsString()
  @Field()
  phoneNumber: string;

  @IsString()
  @Field()
  password: string;

  @IsString()
  @Field({ nullable: true })
  gender!: string;

  @IsString()
  @Field({ nullable: true })
  dob!: string;

  @IsString()
  @Field({ nullable: true })
  taxId!: string;

  @IsString()
  @Field()
  streetAddress: string;

  @IsString()
  @IsOptional()
  @Field({ nullable: true })
  streetAddress2: string;

  @IsString()
  @Field()
  city: string;

  @IsString()
  @Field()
  state: string;

  @IsString()
  @Field()
  zip: string;

  @IsString()
  @Field()
  country: string;

  @IsString()
  @Field()
  signedAgreementId: string;
}