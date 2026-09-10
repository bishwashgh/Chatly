import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';

@Injectable()
export class EmojisService {
  constructor(private prisma: PrismaService, private cloudinary: CloudinaryService) {}

  listByCategory(category?: string) {
    return this.prisma.customEmoji.findMany({
      where: category ? { category } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async uploadEmoji(userId: string, name: string, file: any) {
    const { createReadStream } = await file;
    const imageUrl = await this.cloudinary.uploadStream('chatly/emojis', createReadStream(), 'image');

    return this.prisma.customEmoji.create({
      data: { name, imageUrl, category: 'custom', uploadedBy: userId },
    });
  }
}
