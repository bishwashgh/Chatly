import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphQLUpload } from 'graphql-upload';
import { MediaService } from './media.service';
import { GqlAuthGuard } from '../common/guards/gql-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Resolver()
export class MediaResolver {
  constructor(private mediaService: MediaService) {}

  @UseGuards(GqlAuthGuard)
  @Mutation(() => String)
  uploadMessageMedia(
    @CurrentUser() user: { id: string },
    @Args({ name: 'file', type: () => GraphQLUpload }) file: any,
  ) {
    return this.mediaService.uploadMessageMedia(user.id, file);
  }
}
