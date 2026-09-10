import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { FriendshipsService } from './friendships.service';
import { Friendship, FriendRequest } from './models/friendship.model';
import { User } from '../users/models/user.model';
import { GqlAuthGuard } from '../common/guards/gql-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Resolver()
export class FriendshipsResolver {
  constructor(private friendshipsService: FriendshipsService) {}

  @UseGuards(GqlAuthGuard)
  @Query(() => [User])
  friends(@CurrentUser() user: { id: string }) {
    return this.friendshipsService.friends(user.id);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => [FriendRequest])
  friendRequests(@CurrentUser() user: { id: string }) {
    return this.friendshipsService.incomingRequests(user.id);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => [FriendRequest])
  sentFriendRequests(@CurrentUser() user: { id: string }) {
    return this.friendshipsService.outgoingRequests(user.id);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Friendship)
  sendFriendRequest(
    @CurrentUser() user: { id: string },
    @Args('userId', { type: () => ID }) userId: string,
  ) {
    return this.friendshipsService.sendRequest(user.id, userId);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Friendship)
  acceptFriendRequest(
    @CurrentUser() user: { id: string },
    @Args('userId', { type: () => ID }) userId: string,
  ) {
    return this.friendshipsService.acceptRequest(user.id, userId);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean)
  declineFriendRequest(
    @CurrentUser() user: { id: string },
    @Args('userId', { type: () => ID }) userId: string,
  ) {
    return this.friendshipsService.declineRequest(user.id, userId);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean)
  cancelFriendRequest(
    @CurrentUser() user: { id: string },
    @Args('userId', { type: () => ID }) userId: string,
  ) {
    return this.friendshipsService.cancelRequest(user.id, userId);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean)
  removeFriend(
    @CurrentUser() user: { id: string },
    @Args('userId', { type: () => ID }) userId: string,
  ) {
    return this.friendshipsService.removeFriend(user.id, userId);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => [User])
  blockedUsers(@CurrentUser() user: { id: string }) {
    return this.friendshipsService.blockedUsers(user.id);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean)
  blockUser(
    @CurrentUser() user: { id: string },
    @Args('userId', { type: () => ID }) userId: string,
  ) {
    return this.friendshipsService.blockUser(user.id, userId);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean)
  unblockUser(
    @CurrentUser() user: { id: string },
    @Args('userId', { type: () => ID }) userId: string,
  ) {
    return this.friendshipsService.unblockUser(user.id, userId);
  }
}