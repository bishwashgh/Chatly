import * as AuthSession from 'expo-auth-session';
import { GOOGLE_CLIENT_ID } from '../config';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export function useGoogleAuthRequest() {
  return AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri: AuthSession.makeRedirectUri(),
      usePKCE: true,
    },
    discovery
  );
}

export function extractGoogleIdToken(
  response: AuthSession.AuthSessionResult
): string | null {
  if (response?.type === 'success') {
    const params = response.params as Record<string, string>;
    return params.id_token || null;
  }
  return null;
}