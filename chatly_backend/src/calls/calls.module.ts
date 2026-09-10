import { Module } from '@nestjs/common';
import { CallsService } from './calls.service';
import { CallsResolver } from './calls.resolver';
import { pubSubProvider } from '../common/pubsub.provider';

@Module({
  providers: [CallsService, CallsResolver, pubSubProvider],
})
export class CallsModule {}
