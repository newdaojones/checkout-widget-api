import { Resolver, Query, Arg, Mutation } from 'type-graphql';
import { Checkout } from '../models/Checkout';
import { CheckoutType } from '../types/checkout.type';

@Resolver()
export class CheckoutResolver {
  @Query(() => [CheckoutType])
  async checkouts() {
    return await Checkout.findAll();
  }

  @Query(() => CheckoutType)
  async checkout(@Arg('id') id: number) {
    return await Checkout.findByPk(id);
  }

  @Mutation(() => CheckoutType)
  async createCheckout(
    @Arg('name') name: string,
    @Arg('email') email: string,
    @Arg('password') password: string,
    @Arg('token') token: string
  ) {
    return await Checkout.create({ name, email, password });
  }
}
