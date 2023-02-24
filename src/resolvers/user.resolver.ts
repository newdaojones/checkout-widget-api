import { Resolver, Query, Arg, Mutation } from 'type-graphql';
import { User } from '../models/User';
import { UserType } from '../types/user.input';

@Resolver()
export class UserResolver {
  @Query(() => [UserType])
  async users() {
    return await User.findAll();
  }

  @Query(() => UserType)
  async user(@Arg('id') id: number) {
    return await User.findByPk(id);
  }

  @Mutation(() => UserType)
  async createUser(
    @Arg('name') name: string,
    @Arg('email') email: string,
    @Arg('password') password: string
  ) {
    return await User.create({ name, email, password });
  }
}
