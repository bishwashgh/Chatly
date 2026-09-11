import { Resolver, Query, Mutation, Subscription, Args, ID } from '@nestjs/graphql';
import { UseGuards, Inject } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { CallsService, INCOMING_CALL_SIGNAL, CALL_STATUS_UPDATED } from './calls.service';
import { CallSession } from './models/call-session.model';
import { CallOffer } from './models/call-offer.model';
import { CallLogEntry } from './models/call-log.model';
import { CallType } from './models/call-type.enum';
import { CallStatus } from './models/call-status.enum';
import { GqlAuthGuard } from '../common/guards/gql-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PUB_SUB } from '../common/pubsub.provider';

@Resolver()
export class CallsResolver {
  constructor(
    private callsService: CallsService,
    @Inject(PUB_SUB) private pubSub: RedisPubSub,
  ) {}

  @UseGuards(GqlAuthGuard)
  @Mutation(() => CallSession)
  startCall(
    @CurrentUser() user: { id: string },
    @Args('recipientId', { type: () => ID }) recipientId: string,
    @Args('callType', { type: () => CallType }) callType: CallType,
  ) {
    return this.callsService.startCall(user.id, recipientId, callType);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => [CallLogEntry])
  callLog(@CurrentUser() user: { id: string }) {
    return this.callsService.listCallLog(user.id);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => CallSession)
  updateCallStatus(@CurrentUser() user: { id: string }, @Args('sessionId', { type: () => ID }) sessionId: string, @Args('status', { type: () => CallStatus }) status: CallStatus) {
    return this.callsService.setStatus(user.id, sessionId, status);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => CallSession)
  endCall(@CurrentUser() user: { id: string }, @Args('sessionId', { type: () => ID }) sessionId: string) {
    return this.callsService.endCall(user.id, sessionId);
  }

  @Subscription(() => CallOffer, {
    filter: (payload, variables) => payload.userId === variables.userId,
  })
  incomingCallSignal(@Args('userId', { type: () => ID }) userId: string) {
    return this.pubSub.asyncIterator(INCOMING_CALL_SIGNAL);
  }

  /**
   * Status changes for a single call session. Only the two participants of the
   * requested session receive events; the caller uses ACCEPTED/DECLINED/ENDED
   * to stop ringing, and the recipient uses ENDED to dismiss a cancelled call.
   */
  @Subscription(() => CallSession, {
    filter: (payload, variables) => payload.sessionId === variables.sessionId,
  })
  callStatusUpdated(@Args('sessionId', { type: () => ID }) sessionId: string) {
    return this.pubSub.asyncIterator(CALL_STATUS_UPDATED);
  }
}
