import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class CustomEmoji {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  imageUrl: string;

  @Field()
  category: string;

  @Field()
  createdAt: Date;
}
