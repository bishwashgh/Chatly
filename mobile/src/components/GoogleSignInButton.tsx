import React, { useEffect, useState, useRef } from 'react';
import { Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassButton } from './GlassButton';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../store/themeStore';
import * as AuthSession from 'expo-auth-session';
import { GOOGLE_CLIENT_ID } from '../config';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export function GoogleSignInButton() {
  const { colors } = useTheme();
  const googleLogin = useAuthStore((s) => s.googleLogin);
  const [loading, setLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const mounted = useRef(true);

  // Hook must be called at top level - conditionally use it
  const [request, response, promptAsync] = GOOGLE_CLIENT_ID
    ? AuthSession.useAuthRequest(
        {
          clientId: GOOGLE_CLIENT_ID,
          scopes: ['openid', 'profile', 'email'],
          redirectUri: AuthSession.makeRedirectUri(),
          usePKCE: true,
        },
        discovery
      )
    : [null, null, null];

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setConfigError('Google Sign-In not configured');
    }
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!mounted.current) return;
    if (response?.type === 'success') {
      const idToken = response.params?.id_token;
      if (idToken) {
        setLoading(true);
        googleLogin(idToken)
          .catch((e: any) => Alert.alert('Sign in failed', e?.message || 'Could not sign in with Google.'))
          .finally(() => { if (mounted.current) setLoading(false); });
      }
    } else if (response?.type === 'error') {
      Alert.alert('Sign in failed', 'Google sign-in was interrupted.');
    }
  }, [response]);

  const handlePress = async () => {
    if (!GOOGLE_CLIENT_ID) {
      Alert.alert('Not configured', 'Google Sign-In needs a Client ID. Set "googleClientId" in app.json extra.');
      return;
    }
    if (!request) {
      Alert.alert('Not ready', 'Google Sign-In is still initializing. Try again.');
      return;
    }
    await promptAsync();
  };

  if (!GOOGLE_CLIENT_ID) {
    return (
      <GlassButton
        title="Continue with Google"
        variant="outline"
        onPress={() => Alert.alert('Not configured', 'Google Sign-In needs a Client ID. Set "googleClientId" in app.json extra.')}
        disabled
        icon={<Ionicons name="logo-google" size={18} color={colors.primary} />}
      />
    );
  }

  if (!request) {
    return (
      <GlassButton
        title="Continue with Google"
        variant="outline"
        onPress={() => Alert.alert('Please wait', 'Google Sign-In is initializing...')}
        disabled
        icon={<Ionicons name="logo-google" size={18} color={colors.primary} />}
      />
    );
  }

  return (
    <GlassButton
      title={loading ? 'Signing in...' : 'Continue with Google'}
      variant="outline"
      onPress={handlePress}
      disabled={loading}
      icon={<Ionicons name="logo-google" size={18} color={colors.primary} />}
    />
  );
}