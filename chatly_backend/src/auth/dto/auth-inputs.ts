import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsString, Length, MinLength } from 'class-validator';

@InputType()
export class SignUpInput {
  @Field() @IsString() @Length(2, 80) name: string;
  @Field() @IsEmail() email: string;
  @Field() @IsString() @MinLength(8) password: string;
}

@InputType()
export class SignInInput {
  @Field() @IsEmail() email: string;
  @Field() @IsString() @MinLength(8) password: string;
}

@InputType()
export class VerifyCodeInput {
  @Field() @IsString() challengeId: string;
  @Field() @IsString() @Length(6, 6) code: string;
}

@InputType()
export class RequestResetInput {
  @Field() @IsEmail() email: string;
}

@InputType()
export class CompleteResetInput {
  @Field() @IsEmail() email: string;
  @Field() @IsString() challengeId: string;
  @Field() @IsString() @Length(6, 6) code: string;
  @Field() @IsString() @MinLength(8) password: string;
}
