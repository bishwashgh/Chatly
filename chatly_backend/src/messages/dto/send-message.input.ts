import { InputType, Field, ID } from '@nestjs/graphql';
import { MessageType } from '../models/message-type.enum';

@InputType()
export class SendMessageInput {
  @Field(() => ID)
  conversationId: string;

  @Field({ nullable: true })
  content?: string;

  @Field({ nullable: true })
  mediaUrl?: string;

  @Field(() => MessageType)
  messageType: MessageType;
}
