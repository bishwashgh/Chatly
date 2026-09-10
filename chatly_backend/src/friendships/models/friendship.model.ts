import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { User } from '../../users/models/user.model';

export enum FriendshipStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}

registerEnumType(FriendshipStatus, { name: 'FriendshipStatus' });

@ObjectType()
export class Friendship {
  @Field(() => ID)
  id: string;

  @Field(() => FriendshipStatus)
  status: FriendshipStatus;

  /** The other party, resolved relative to the calling user. */
  @Field(() => User)
  user: User;
}

@ObjectType()
export class FriendRequest {
  @Field(() => ID)
  id: string;

  @Field(() => User)
  user: User;

  @Field()
  createdAt: Date;
}