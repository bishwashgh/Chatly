import { ObjectType, Field, ID } from '@nestjs/graphql';
import { User } from '../../users/models/user.model';
import { Reaction } from '../../reactions/models/reaction.model';
import { MessageType } from './message-type.enum';

@ObjectType()
export class Message {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  conversationId: string;

  @Field(() => User)
  sender: User;

  @Field({ nullable: true })
  content?: string;

  @Field({ nullable: true })
  mediaUrl?: string;

  @Field(() => MessageType)
  messageType: MessageType;

  @Field(() => [Reaction], { nullable: true })
  reactions?: Reaction[];

  @Field()
  isRead: boolean;

  @Field()
  isDelivered: boolean;

  @Field()
  createdAt: Date;
}
