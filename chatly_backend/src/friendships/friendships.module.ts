import { Module } from '@nestjs/common';
import { FriendshipsService } from './friendships.service';
import { FriendshipsResolver } from './friendships.resolver';

@Module({
  providers: [FriendshipsService, FriendshipsResolver],
  exports: [FriendshipsService],
})
export class FriendshipsModule {}