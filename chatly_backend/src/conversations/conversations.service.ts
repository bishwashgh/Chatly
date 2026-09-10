import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversationsService {
  constructor(private prisma: PrismaService) {}

  async findOrCreateDirect(userId: string, otherUserId: string) {
    const existing = await this.prisma.conversation.findFirst({
      where: {
        isGroup: false,
        participants: { some: { userId } },
        AND: [{ participants: { some: { userId: otherUserId } } }],
      },
      include: { participants: { include: { user: true } } },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      data: {
        isGroup: false,
        participants: {
          create: [{ userId }, { userId: otherUserId }],
        },
      },
      include: { participants: { include: { user: true } } },
    });
  }

  createGroup(creatorId: string, title: string, memberIds: string[]) {
    const uniqueIds = Array.from(new Set([creatorId, ...memberIds]));
    return this.prisma.conversation.create({
      data: {
        isGroup: true,
        title,
        participants: { create: uniqueIds.map((userId) => ({ userId })) },
      },
      include: { participants: { include: { user: true } } },
    });
  }

  listForUser(userId: string) {
    return this.prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: { participants: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  getLastMessage(conversationId: string) {
    return this.prisma.message.findFirst({
      where: { conversationId },
      include: { sender: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  getUnreadCount(conversationId: string, userId: string) {
    return this.prisma.message.count({
      where: { conversationId, senderId: { not: userId }, isRead: false },
    });
  }
}
