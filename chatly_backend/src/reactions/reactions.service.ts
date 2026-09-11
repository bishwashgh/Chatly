import { Injectable, Inject, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PUB_SUB } from '../common/pubsub.provider';
import { RedisPubSub } from 'graphql-redis-subscriptions';

export const MESSAGE_REACTION_UPDATED = 'messageReactionUpdated';

@Injectable()
export class ReactionsService {
  constructor(
    private prisma: PrismaService,
    @Inject(PUB_SUB) private pubSub: RedisPubSub,
  ) {}

  async toggleReaction(userId: string, messageId: string, emoji: string) {
    const target = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, conversationId: true },
    });
    if (!target) {
      throw new NotFoundException('Message not found');
    }
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: target.conversationId, userId } },
    });
    if (!participant) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }

    const existing = await this.prisma.reaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
    });

    if (existing) {
      await this.prisma.reaction.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.reaction.create({ data: { messageId, userId, emoji } });
    }

    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { sender: true, reactions: { include: { user: true } } },
    });

    try {
      await this.pubSub.publish(MESSAGE_REACTION_UPDATED, {
        messageReactionUpdated: message,
        conversationId: message?.conversationId,
      });
    } catch (error) {
      console.warn('Could not publish messageReactionUpdated event:', error);
    }

    return message;
  }
}
