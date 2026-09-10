import { Resolver, Mutation, Subscription, Args, ID } from '@nestjs/graphql';
import { UseGuards, Inject } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { ReactionsService, MESSAGE_REACTION_UPDATED } from './reactions.service';
import { Message } from '../messages/models/message.model';
import { GqlAuthGuard } from '../common/guards/gql-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PUB_SUB } from '../common/pubsub.provider';

@Resolver()
export class ReactionsResolver {
  constructor(
    private reactionsService: ReactionsService,
    @Inject(PUB_SUB) private pubSub: RedisPubSub,
  ) {}

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Message)
  toggleReaction(
    @CurrentUser() user: { id: string },
    @Args('messageId', { type: () => ID }) messageId: string,
    @Args('emojiId') emojiId: string,
  ) {
    return this.reactionsService.toggleReaction(user.id, messageId, emojiId);
  }

  @Subscription(() => Message, {
    filter: (payload, variables) => payload.conversationId === variables.conversationId,
  })
  messageReactionUpdated(@Args('conversationId', { type: () => ID }) conversationId: string) {
    return this.pubSub.asyncIterator(MESSAGE_REACTION_UPDATED);
  }
}
