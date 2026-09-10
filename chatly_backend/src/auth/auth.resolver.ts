import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { AuthPayload } from './dto/auth-payload.type';
import { SignInInput, SignUpInput, VerifyCodeInput, RequestResetInput, CompleteResetInput } from './dto/auth-inputs';
import { VerificationResult } from './models/verification-result.model';
import { User } from '../users/models/user.model';

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Mutation(() => VerificationResult)
  signUp(@Args('input') input: SignUpInput) {
    return this.authService.signUp(input.name, input.email, input.password);
  }

  @Mutation(() => VerificationResult)
  resendSignupCode(@Args('challengeId') challengeId: string) {
    return this.authService.resendSignupCode(challengeId);
  }

  @Mutation(() => AuthPayload)
  verifySignup(@Args('input') input: VerifyCodeInput) {
    return this.authService.verifySignup(input.challengeId, input.code);
  }

  @Mutation(() => AuthPayload)
  signIn(@Args('input') input: SignInInput) {
    return this.authService.signIn(input.email, input.password);
  }

  @Mutation(() => VerificationResult)
  requestPasswordReset(@Args('input') input: RequestResetInput) {
    return this.authService.requestPasswordReset(input.email);
  }

  @Mutation(() => VerificationResult)
  resendPasswordResetCode(@Args('email') email: string, @Args('challengeId') challengeId: string) {
    return this.authService.resendPasswordResetCode(email, challengeId);
  }

  @Mutation(() => User)
  resetPassword(@Args('input') input: CompleteResetInput) {
    return this.authService.resetPassword(input.email, input.challengeId, input.code, input.password);
  }

  @Mutation(() => AuthPayload)
  async loginWithGoogle(@Args('idToken') idToken: string) {
    return this.authService.loginWithGoogle(idToken);
  }

  @Mutation(() => AuthPayload)
  async refreshToken(@Args('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }
}
