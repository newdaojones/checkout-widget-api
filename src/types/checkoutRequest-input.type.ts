import { IsNumber, IsOptional, IsString } from "class-validator";
import { Field, InputType } from "type-graphql";

@InputType()
export class CheckoutRequestInputType {
  @IsString()
  @Field()
  walletAddress: string;

  @IsString()
  @Field()
  email: string;

  @IsString()
  @Field()
  phoneNumber: string;

  @IsNumber()
  @Field()
  amount: number;

  @IsString()
  @IsOptional()
  @Field({ nullable: true })
  webhook: string;
}