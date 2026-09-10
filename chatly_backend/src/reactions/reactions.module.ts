import { Module } from '@nestjs/common';
import { ReactionsService } from './reactions.service';
import { ReactionsResolver } from './reactions.resolver';
import { pubSubProvider } from '../common/pubsub.provider';

@Module({
  providers: [ReactionsService, ReactionsResolver, pubSubProvider],
})
export class ReactionsModule {}
