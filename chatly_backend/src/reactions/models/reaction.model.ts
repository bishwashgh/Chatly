import { ObjectType, Field, ID } from '@nestjs/graphql';
import { User } from '../../users/models/user.model';

@ObjectType()
export class Reaction {
  @Field(() => ID)
  id: string;

  @Field()
  emoji: string;

  @Field(() => User)
  user: User;

  @Field()
  createdAt: Date;
}
