import { Injectable } from '@nestjs/common';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';

@Injectable()
export class MediaService {
  constructor(private cloudinary: CloudinaryService) {}

  async uploadMessageMedia(userId: string, file: any) {
    const { createReadStream, mimetype } = await file;
    const resourceType = mimetype?.startsWith('video') ? 'video' : mimetype?.startsWith('image') ? 'image' : 'auto';
    return this.cloudinary.uploadStream(`chatly/messages/${userId}`, createReadStream(), resourceType);
  }
}
