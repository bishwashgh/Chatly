import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class MessageStatus {
  @Field(() => ID)
  messageId: string;

  @Field(() => ID)
  conversationId: string;

  @Field()
  isDelivered: boolean;

  @Field()
  isRead: boolean;
}
