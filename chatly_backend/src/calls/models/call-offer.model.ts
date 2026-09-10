import { ObjectType, Field, ID } from '@nestjs/graphql';
import { User } from '../../users/models/user.model';
import { CallType } from './call-type.enum';

@ObjectType()
export class CallOffer {
  @Field(() => ID)
  sessionId: string;

  @Field()
  roomToken: string;

  @Field()
  channelName: string;

  @Field(() => User)
  caller: User;

  @Field(() => CallType)
  callType: CallType;
}
