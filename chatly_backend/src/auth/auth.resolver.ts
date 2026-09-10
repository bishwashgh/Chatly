import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { AuthPayload } from './dto/auth-payload.type';

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Mutation(() => AuthPayload)
  async loginWithGoogle(@Args('idToken') idToken: string) {
    return this.authService.loginWithGoogle(idToken);
  }

  @Mutation(() => AuthPayload)
  async refreshToken(@Args('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }
}
