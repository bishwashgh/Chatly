import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class VerificationResult {
  @Field()
  challengeId: string;

  @Field()
  destination: string;

  @Field()
  expiresInSeconds: number;
}
