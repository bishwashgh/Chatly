import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async search(query: string, excludeUserId?: string) {
    const hiddenIds: string[] = [];
    if (excludeUserId) {
      hiddenIds.push(excludeUserId);
      const blocks = await this.prisma.blockedUser.findMany({
        where: {
          OR: [{ blockerId: excludeUserId }, { blockedId: excludeUserId }],
        },
        select: { blockerId: true, blockedId: true },
      });
      blocks.forEach((b) => {
        hiddenIds.push(b.blockerId, b.blockedId);
      });
    }

    return this.prisma.user.findMany({
      where: {
        ...(hiddenIds.length ? { id: { notIn: hiddenIds } } : {}),
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 20,
    });
  }

  updateProfile(
    userId: string,
    data: { name?: string; bio?: string; avatarUrl?: string; friendGated?: boolean },
  ) {
    return this.prisma.user.update({ where: { id: userId }, data });
  }

  async deactivateAccount(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isOnline: false, isActive: false, refreshToken: null },
    });
  }

  setOnlineStatus(userId: string, isOnline: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isOnline, lastSeen: new Date() },
    });
  }
}
