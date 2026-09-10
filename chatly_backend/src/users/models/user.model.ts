import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field()
  username: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  bio?: string;

  @Field({ nullable: true })
  avatarUrl?: string;

  @Field()
  isOnline: boolean;

  @Field()
  isActive: boolean;

  @Field()
  lastSeen: Date;

  @Field()
  createdAt: Date;
}
