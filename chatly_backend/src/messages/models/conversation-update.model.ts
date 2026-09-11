import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Message } from './message.model';

/**
 * Emitted to every participant of a conversation whenever it receives a new
 * message. It carries just enough data for an inbox to update its preview and
 * unread badge without refetching or polling.
 */
@ObjectType()
export class ConversationUpdate {
  @Field(() => ID)
  conversationId: string;

  @Field(() => Message, { nullable: true })
  lastMessage?: Message;
}
