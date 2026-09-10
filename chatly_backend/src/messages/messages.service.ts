import { Injectable, Inject, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PUB_SUB } from '../common/pubsub.provider';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { MessageType } from './models/message-type.enum';

export const MESSAGE_ADDED = 'messageAdded';
export const USER_TYPING_STATUS = 'userTypingStatus';
export const MESSAGE_STATUS_UPDATED = 'messageStatusUpdated';

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

    await this.pubSub.publish(MESSAGE_ADDED, {
      messageAdded: message,
      conversationId,
    });

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
    await this.pubSub.publish(USER_TYPING_STATUS, {
      userTypingStatus: { conversationId, userId, isTyping },
      conversationId,
    });
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

    await this.pubSub.publish(MESSAGE_STATUS_UPDATED, {
      messageStatusUpdated: {
        messageId: message.id,
        conversationId,
        isDelivered: message.isDelivered,
        isRead: message.isRead,
      },
      conversationId,
    });

    return message;
  }
}