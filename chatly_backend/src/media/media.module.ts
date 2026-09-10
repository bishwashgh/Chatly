import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaResolver } from './media.resolver';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';

@Module({
  imports: [CloudinaryModule],
  providers: [MediaService, MediaResolver],
})
export class MediaModule {}
