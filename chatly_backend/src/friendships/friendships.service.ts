import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FriendshipStatus } from './models/friendship.model';

@Injectable()
export class FriendshipsService {
  constructor(private prisma: PrismaService) {}

  async sendRequest(userId: string, targetId: string) {
    if (userId === targetId) {
      throw new BadRequestException("You can't add yourself as a friend");
    }

    const block = await this.prisma.blockedUser.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: targetId },
          { blockerId: targetId, blockedId: userId },
        ],
      },
    });
    if (block) {
      throw new BadRequestException('You cannot send a friend request to this user');
    }

    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId: targetId },
          { requesterId: targetId, addresseeId: userId },
        ],
      },
    });

    if (existing) {
      if (existing.status === FriendshipStatus.ACCEPTED) {
        throw new BadRequestException('You are already friends');
      }
      if (existing.requesterId === userId && existing.status === FriendshipStatus.PENDING) {
        throw new BadRequestException('Friend request already sent');
      }
      if (existing.requesterId === targetId && existing.status === FriendshipStatus.PENDING) {
        // Mutual request — accept automatically
        const updated = await this.prisma.friendship.update({
          where: { id: existing.id },
          data: { status: FriendshipStatus.ACCEPTED },
        });
        const user = await this.prisma.user.findUnique({ where: { id: targetId } });
        return { id: updated.id, status: updated.status, user };
      }
      // Previously declined — allow re-sending from the requester side
      const updated = await this.prisma.friendship.update({
        where: { id: existing.id },
        data: { requesterId: userId, addresseeId: targetId, status: FriendshipStatus.PENDING },
      });
      const user = await this.prisma.user.findUnique({ where: { id: targetId } });
      return { id: updated.id, status: updated.status, user };
    }

    const created = await this.prisma.friendship.create({
      data: { requesterId: userId, addresseeId: targetId, status: FriendshipStatus.PENDING },
    });
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    return { id: created.id, status: created.status, user };
  }

  async acceptRequest(userId: string, requesterId: string) {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        requesterId,
        addresseeId: userId,
        status: FriendshipStatus.PENDING,
      },
    });
    if (!friendship) {
      throw new NotFoundException('Friend request not found');
    }
    const updated = await this.prisma.friendship.update({
      where: { id: friendship.id },
      data: { status: FriendshipStatus.ACCEPTED },
    });
    const user = await this.prisma.user.findUnique({ where: { id: requesterId } });
    return { id: updated.id, status: updated.status, user };
  }

  async declineRequest(userId: string, requesterId: string) {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        requesterId,
        addresseeId: userId,
        status: FriendshipStatus.PENDING,
      },
    });
    if (!friendship) {
      throw new NotFoundException('Friend request not found');
    }
    await this.prisma.friendship.update({
      where: { id: friendship.id },
      data: { status: FriendshipStatus.DECLINED },
    });
    return true;
  }

  async cancelRequest(userId: string, targetId: string) {
    await this.prisma.friendship.deleteMany({
      where: {
        requesterId: userId,
        addresseeId: targetId,
        status: FriendshipStatus.PENDING,
      },
    });
    return true;
  }

  async removeFriend(userId: string, friendId: string) {
    await this.prisma.friendship.deleteMany({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [
          { requesterId: userId, addresseeId: friendId },
          { requesterId: friendId, addresseeId: userId },
        ],
      },
    });
    return true;
  }

  async friends(userId: string) {
    const rows = await this.prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: { requester: true, addressee: true },
    });
    return rows.map((r) => (r.requesterId === userId ? r.addressee : r.requester));
  }

  async incomingRequests(userId: string) {
    const rows = await this.prisma.friendship.findMany({
      where: { addresseeId: userId, status: FriendshipStatus.PENDING },
      include: { requester: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({ id: r.id, user: r.requester, createdAt: r.createdAt }));
  }

  async outgoingRequests(userId: string) {
    const rows = await this.prisma.friendship.findMany({
      where: { requesterId: userId, status: FriendshipStatus.PENDING },
      include: { addressee: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({ id: r.id, user: r.addressee, createdAt: r.createdAt }));
  }

  async blockUser(userId: string, targetId: string) {
    if (userId === targetId) {
      throw new BadRequestException("You can't block yourself");
    }
    await this.prisma.blockedUser.upsert({
      where: { blockerId_blockedId: { blockerId: userId, blockedId: targetId } },
      create: { blockerId: userId, blockedId: targetId },
      update: {},
    });
    // Remove any friendship between the two so the blocked user disappears
    // from the friends list and pending requests.
    await this.prisma.friendship.deleteMany({
      where: {
        OR: [
          { requesterId: userId, addresseeId: targetId },
          { requesterId: targetId, addresseeId: userId },
        ],
      },
    });
    return true;
  }

  async unblockUser(userId: string, targetId: string) {
    await this.prisma.blockedUser.deleteMany({
      where: { blockerId: userId, blockedId: targetId },
    });
    return true;
  }

  async blockedUsers(userId: string) {
    const rows = await this.prisma.blockedUser.findMany({
      where: { blockerId: userId },
      include: { blocked: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => r.blocked);
  }
}