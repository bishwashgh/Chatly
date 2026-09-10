import { Injectable, Inject, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AccessToken } from 'livekit-server-sdk';
import { PrismaService } from '../prisma/prisma.service';
import { PUB_SUB } from '../common/pubsub.provider';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { CallType } from './models/call-type.enum';
import { CallStatus } from './models/call-status.enum';

export const INCOMING_CALL_SIGNAL = 'incomingCallSignal';

@Injectable()
export class CallsService {
  constructor(
    private prisma: PrismaService,
    @Inject(PUB_SUB) private pubSub: RedisPubSub,
  ) {}

  private async mintToken(roomName: string, identity: string) {
    const token = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      { identity },
    );
    token.addGrant({ roomJoin: true, room: roomName });
    return token.toJwt();
  }

  async startCall(callerId: string, recipientId: string, callType: CallType) {
    const channelName = `chatly-${callerId}-${recipientId}-${Date.now()}`;

    const session = await this.prisma.callSession.create({
      data: {
        callerId,
        recipientId,
        channelName,
        callType,
        roomToken: '',
        status: CallStatus.RINGING,
      },
      include: { caller: true, recipient: true },
    });

    const callerToken = await this.mintToken(channelName, callerId);
    const recipientToken = await this.mintToken(channelName, recipientId);

    await this.prisma.callSession.update({
      where: { id: session.id },
      data: { roomToken: callerToken },
    });

    await this.pubSub.publish(INCOMING_CALL_SIGNAL, {
      incomingCallSignal: {
        sessionId: session.id,
        roomToken: recipientToken,
        channelName,
        caller: session.caller,
        callType,
      },
      userId: recipientId,
    });

    return { ...session, roomToken: callerToken };
  }

  async endCall(userId: string, sessionId: string) {
    const session = await this.prisma.callSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException('Call session not found');
    }
    if (session.callerId !== userId && session.recipientId !== userId) {
      throw new ForbiddenException('You are not part of this call');
    }
    return this.prisma.callSession.update({
      where: { id: sessionId },
      data: { status: CallStatus.ENDED, endedAt: new Date() },
    });
  }

  async updateStatus(sessionId: string, status: CallStatus) {
    return this.prisma.callSession.update({ where: { id: sessionId }, data: { status } });
  }
}
