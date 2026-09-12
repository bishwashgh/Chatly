import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdateProfileInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  bio?: string;

  @Field({ nullable: true })
  avatarUrl?: string;

  /**
   * Privacy setting rather than a profile field, but it lives here so the
   * existing updateProfile mutation stays the single write path for the User
   * record and the client can reuse its cache entry.
   */
  @Field({ nullable: true })
  friendGated?: boolean;
}
