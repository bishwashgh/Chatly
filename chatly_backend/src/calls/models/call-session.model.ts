import { ObjectType, Field, ID } from '@nestjs/graphql';
import { User } from '../../users/models/user.model';
import { CallType } from './call-type.enum';
import { CallStatus } from './call-status.enum';

@ObjectType()
export class CallSession {
  @Field(() => ID)
  id: string;

  @Field()
  roomToken: string;

  @Field()
  channelName: string;

  @Field(() => User)
  caller: User;

  @Field(() => User)
  recipient: User;

  @Field(() => CallType)
  callType: CallType;

  @Field(() => CallStatus)
  status: CallStatus;

  @Field()
  startedAt: Date;
}
