import { InputType, Field, ID } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { MessageType } from '../models/message-type.enum';

@InputType()
export class SendMessageInput {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  content?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @Field(() => MessageType)
  @IsEnum(MessageType)
  messageType: MessageType;
}
