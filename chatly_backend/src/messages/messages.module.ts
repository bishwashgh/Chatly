import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesResolver } from './messages.resolver';
import { pubSubProvider } from '../common/pubsub.provider';

@Module({
  providers: [MessagesService, MessagesResolver, pubSubProvider],
  exports: [MessagesService],
})
export class MessagesModule {}
