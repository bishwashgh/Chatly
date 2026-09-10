import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class TypingIndicator {
  @Field(() => ID)
  conversationId: string;

  @Field(() => ID)
  userId: string;

  @Field()
  isTyping: boolean;
}
