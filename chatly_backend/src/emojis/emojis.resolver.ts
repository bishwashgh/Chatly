import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphQLUpload } from 'graphql-upload';
import { EmojisService } from './emojis.service';
import { CustomEmoji } from './models/custom-emoji.model';
import { GqlAuthGuard } from '../common/guards/gql-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Resolver(() => CustomEmoji)
export class EmojisResolver {
  constructor(private emojisService: EmojisService) {}

  @Query(() => [CustomEmoji])
  customEmojis(@Args('category', { nullable: true }) category?: string) {
    return this.emojisService.listByCategory(category);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => CustomEmoji)
  uploadCustomEmoji(
    @CurrentUser() user: { id: string },
    @Args('name') name: string,
    @Args({ name: 'file', type: () => GraphQLUpload }) file: any,
  ) {
    return this.emojisService.uploadEmoji(user.id, name, file);
  }
}
