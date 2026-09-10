import { Resolver, Query, Mutation, Subscription, Args, ID } from '@nestjs/graphql';
import { UseGuards, Inject } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import {
  MessagesService,
  MESSAGE_ADDED,
  USER_TYPING_STATUS,
  MESSAGE_STATUS_UPDATED,
} from './messages.service';
import { Message } from './models/message.model';
import { TypingIndicator } from './models/typing-indicator.model';
import { MessageStatus } from './models/message-status.model';
import { SendMessageInput } from './dto/send-message.input';
import { GqlAuthGuard } from '../common/guards/gql-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PUB_SUB } from '../common/pubsub.provider';

@Resolver(() => Message)
export class MessagesResolver {
  constructor(
    private messagesService: MessagesService,
    @Inject(PUB_SUB) private pubSub: RedisPubSub,
  ) {}

  @UseGuards(GqlAuthGuard)
  @Query(() => [Message])
  messages(@CurrentUser() user: { id: string }, @Args('conversationId', { type: () => ID }) conversationId: string) {
    return this.messagesService.listMessages(user.id, conversationId);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Message)
  sendMessage(@CurrentUser() user: { id: string }, @Args('input') input: SendMessageInput) {
    return this.messagesService.sendMessage(
      user.id,
      input.conversationId,
      input.messageType,
      input.content,
      input.mediaUrl,
    );
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean)
  deleteMessage(@CurrentUser() user: { id: string }, @Args('messageId', { type: () => ID }) messageId: string) {
    return this.messagesService.deleteMessage(user.id, messageId);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean)
  typing(
    @CurrentUser() user: { id: string },
    @Args('conversationId', { type: () => ID }) conversationId: string,
    @Args('isTyping') isTyping: boolean,
  ) {
    return this.messagesService.setTyping(conversationId, user.id, isTyping);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Message)
  markAsRead(
    @CurrentUser() user: { id: string },
    @Args('conversationId', { type: () => ID }) conversationId: string,
    @Args('messageId', { type: () => ID }) messageId: string,
  ) {
    return this.messagesService.markAsRead(user.id, conversationId, messageId);
  }

  @Subscription(() => Message, {
    filter: (payload, variables) => payload.conversationId === variables.conversationId,
  })
  messageAdded(@Args('conversationId', { type: () => ID }) conversationId: string) {
    return this.pubSub.asyncIterator(MESSAGE_ADDED);
  }

  @Subscription(() => TypingIndicator, {
    filter: (payload, variables) => payload.conversationId === variables.conversationId,
  })
  userTypingStatus(@Args('conversationId', { type: () => ID }) conversationId: string) {
    return this.pubSub.asyncIterator(USER_TYPING_STATUS);
  }

  @Subscription(() => MessageStatus, {
    filter: (payload, variables) => payload.conversationId === variables.conversationId,
  })
  messageStatusUpdated(@Args('conversationId', { type: () => ID }) conversationId: string) {
    return this.pubSub.asyncIterator(MESSAGE_STATUS_UPDATED);
  }
}
