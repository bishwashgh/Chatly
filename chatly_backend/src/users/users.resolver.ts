import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './models/user.model';
import { UpdateProfileInput } from './dto/update-profile.input';
import { GqlAuthGuard } from '../common/guards/gql-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Resolver(() => User)
export class UsersResolver {
  constructor(private usersService: UsersService) {}

  @UseGuards(GqlAuthGuard)
  @Query(() => User)
  me(@CurrentUser() user: User) {
    return user;
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => User, { nullable: true })
  user(@Args('id', { type: () => ID }) id: string) {
    return this.usersService.findById(id);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => [User])
  searchUsers(@CurrentUser() user: User, @Args('query') query: string) {
    return this.usersService.search(query, user.id);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => User)
  updateProfile(@CurrentUser() user: User, @Args('input') input: UpdateProfileInput) {
    return this.usersService.updateProfile(user.id, input);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean)
  async deactivateAccount(@CurrentUser() user: User) {
    await this.usersService.deactivateAccount(user.id);
    return true;
  }
}
