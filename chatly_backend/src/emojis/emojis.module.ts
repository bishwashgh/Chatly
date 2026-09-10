import { Module } from '@nestjs/common';
import { EmojisService } from './emojis.service';
import { EmojisResolver } from './emojis.resolver';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';

@Module({
  imports: [CloudinaryModule],
  providers: [EmojisService, EmojisResolver],
})
export class EmojisModule {}
