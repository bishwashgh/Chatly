import { gql } from '@apollo/client';

const USER_FIELDS = `
  id email username name bio avatarUrl isOnline isActive friendGated createdAt
`;

export const ME_QUERY = gql`query Me { me { ${USER_FIELDS} } }`;

export const REFRESH_TOKEN = gql`
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) { accessToken refreshToken user { ${USER_FIELDS} } }
  }
`;

export const LOGIN_WITH_GOOGLE = gql`
  mutation LoginWithGoogle($idToken: String!) {
    loginWithGoogle(idToken: $idToken) { accessToken refreshToken user { ${USER_FIELDS} } }
  }
`;

export const SIGN_IN = gql`
  mutation SignIn($input: SignInInput!) {
    signIn(input: $input) { accessToken refreshToken user { ${USER_FIELDS} } }
  }
`;

export const SIGN_UP = gql`
  mutation SignUp($input: SignUpInput!) {
    signUp(input: $input) { challengeId destination expiresInSeconds }
  }
`;

export const RESEND_SIGNUP_CODE = gql`
  mutation ResendSignupCode($challengeId: String!) {
    resendSignupCode(challengeId: $challengeId) { challengeId destination expiresInSeconds }
  }
`;

export const VERIFY_SIGNUP = gql`
  mutation VerifySignup($input: VerifyCodeInput!) {
    verifySignup(input: $input) { accessToken refreshToken user { ${USER_FIELDS} } }
  }
`;

export const REQUEST_PASSWORD_RESET = gql`
  mutation RequestPasswordReset($input: RequestResetInput!) {
    requestPasswordReset(input: $input) { challengeId destination expiresInSeconds }
  }
`;

export const RESEND_PASSWORD_RESET_CODE = gql`
  mutation ResendPasswordResetCode($email: String!, $challengeId: String!) {
    resendPasswordResetCode(email: $email, challengeId: $challengeId) { challengeId destination expiresInSeconds }
  }
`;

export const RESET_PASSWORD = gql`
  mutation ResetPassword($input: CompleteResetInput!) {
    resetPassword(input: $input) { id }
  }
`;
