import { Resolver, Query, Mutation, Args, ID, Int, ResolveField, Parent, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { Conversation } from './models/conversation.model';
import { Message } from '../messages/models/message.model';
import { GqlAuthGuard } from '../common/guards/gql-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Resolver(() => Conversation)
export class ConversationsResolver {
  constructor(private conversationsService: ConversationsService) {}

  @UseGuards(GqlAuthGuard)
  @Query(() => [Conversation])
  myConversations(@CurrentUser() user: { id: string }) {
    return this.conversationsService.listForUser(user.id);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Conversation)
  createDirectConversation(
    @CurrentUser() user: { id: string },
    @Args('recipientId', { type: () => ID }) recipientId: string,
  ) {
    return this.conversationsService.findOrCreateDirect(user.id, recipientId);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Conversation)
  createGroupConversation(
    @CurrentUser() user: { id: string },
    @Args('title') title: string,
    @Args('memberIds', { type: () => [ID] }) memberIds: string[],
  ) {
    return this.conversationsService.createGroup(user.id, title, memberIds);
  }

  @ResolveField('participants')
  participants(@Parent() conversation: any) {
    return conversation.participants?.map((p: any) => p.user) ?? [];
  }

  @ResolveField(() => Message, { nullable: true })
  lastMessage(@Parent() conversation: any) {
    return this.conversationsService.getLastMessage(conversation.id);
  }

  @ResolveField(() => Int)
  unreadCount(@Parent() conversation: any, @Context('req') req: any) {
    return this.conversationsService.getUnreadCount(conversation.id, req?.user?.id);
  }
}