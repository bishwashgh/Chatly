import { Injectable, Inject, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PUB_SUB } from '../common/pubsub.provider';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { MessageType } from './models/message-type.enum';

export const MESSAGE_ADDED = 'messageAdded';
export const USER_TYPING_STATUS = 'userTypingStatus';
export const MESSAGE_STATUS_UPDATED = 'messageStatusUpdated';
export const CONVERSATION_UPDATED = 'conversationUpdated';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    @Inject(PUB_SUB) private pubSub: RedisPubSub,
  ) {}

  private async assertParticipant(userId: string, conversationId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }
  }

  async sendMessage(
    senderId: string,
    conversationId: string,
    messageType: MessageType,
    content?: string,
    mediaUrl?: string,
  ) {
    if (!content?.trim() && !mediaUrl) {
      throw new NotFoundException('Message must have content or media');
    }
    await this.assertParticipant(senderId, conversationId);

    // Blocked users can't message each other.
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    const otherId = participants.find((p) => p.userId !== senderId)?.userId;
    if (otherId) {
      const block = await this.prisma.blockedUser.findFirst({
        where: {
          OR: [
            { blockerId: senderId, blockedId: otherId },
            { blockerId: otherId, blockedId: senderId },
          ],
        },
      });
      if (block) {
        throw new ForbiddenException('You cannot message this user');
      }
    }

    const message = await this.prisma.message.create({
      data: { senderId, conversationId, messageType, content, mediaUrl, isDelivered: true },
      include: { sender: true, reactions: { include: { user: true } } },
    });

    try {
      await this.pubSub.publish(MESSAGE_ADDED, {
        messageAdded: message,
        conversationId,
      });
    } catch (error) {
      // Realtime delivery is best-effort. Redis outages must not make a
      // successfully persisted message look like a failed send.
      console.warn('Could not publish messageAdded event:', error);
    }

    // Per-user signal so inboxes can refresh previews and unread badges without
    // subscribing to every conversation or polling.
    try {
      await this.pubSub.publish(CONVERSATION_UPDATED, {
        conversationUpdated: { conversationId, lastMessage: message },
        conversationId,
        participantIds: participants.map((p) => p.userId),
      });
    } catch (error) {
      console.warn('Could not publish conversationUpdated event:', error);
    }

    return message;
  }

  async listMessages(userId: string, conversationId: string) {
    await this.assertParticipant(userId, conversationId);

    return this.prisma.message.findMany({
      where: { conversationId },
      include: { sender: true, reactions: { include: { user: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async setTyping(conversationId: string, userId: string, isTyping: boolean) {
    await this.assertParticipant(userId, conversationId);
    try {
      await this.pubSub.publish(USER_TYPING_STATUS, {
        userTypingStatus: { conversationId, userId, isTyping },
        conversationId,
      });
    } catch (error) {
      // Typing indicators are transient and should never block the editor.
      console.warn('Could not publish userTypingStatus event:', error);
    }
    return true;
  }

  async deleteMessage(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) throw new ForbiddenException('You can only delete your own messages');
    await this.prisma.message.delete({ where: { id: messageId } });
    return true;
  }

  async markAsRead(userId: string, conversationId: string, messageId: string) {
    await this.assertParticipant(userId, conversationId);

    const message = await this.prisma.message.update({
      where: { id: messageId },
      data: { isRead: true, isDelivered: true },
    });

    try {
      await this.pubSub.publish(MESSAGE_STATUS_UPDATED, {
        messageStatusUpdated: {
          messageId: message.id,
          conversationId,
          isDelivered: message.isDelivered,
          isRead: message.isRead,
        },
        conversationId,
      });
    } catch (error) {
      console.warn('Could not publish messageStatusUpdated event:', error);
    }

    return message;
  }
}