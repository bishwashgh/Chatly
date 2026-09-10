import { ObjectType, Field, ID } from '@nestjs/graphql';
import { User } from '../../users/models/user.model';

@ObjectType()
export class Conversation {
  @Field(() => ID)
  id: string;

  @Field()
  isGroup: boolean;

  @Field({ nullable: true })
  title?: string;

  @Field(() => [User])
  participants: User[];

  @Field()
  createdAt: Date;
}
