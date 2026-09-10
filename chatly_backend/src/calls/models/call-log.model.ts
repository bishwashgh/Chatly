import { Field, ObjectType, ID } from '@nestjs/graphql';
import { User } from '../../users/models/user.model';
import { CallType } from './call-type.enum';
import { CallStatus } from './call-status.enum';

@ObjectType()
export class CallLogEntry {
  @Field(() => ID)
  id: string;

  @Field(() => User)
  peer: User;

  @Field(() => CallType)
  callType: CallType;

  @Field(() => CallStatus)
  status: CallStatus;

  @Field()
  startedAt: Date;

  @Field({ nullable: true })
  endedAt?: Date;
}
