import React, { useEffect, useState, useRef } from 'react';
import { Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassButton } from './GlassButton';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../store/themeStore';

export function GoogleSignInButton() {
  const { colors } = useTheme();
  const googleLogin = useAuthStore((s) => s.googleLogin);
  const [loading, setLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [request, setRequest] = useState<any>(null);
  const [response, setResponse] = useState<any>(null);
  const [promptAsync, setPromptAsync] = useState<any>(null);
  const [initialized, setInitialized] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const AuthSession = await import('expo-auth-session');
        const { GOOGLE_CLIENT_ID } = await import('../config');

        if (!GOOGLE_CLIENT_ID) {
          if (mounted.current) setConfigError('Google Sign-In not configured');
          return;
        }

        const discovery = {
          authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenEndpoint: 'https://oauth2.googleapis.com/token',
          revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
        };

        const [req, resp, prompt] = AuthSession.useAuthRequest(
          {
            clientId: GOOGLE_CLIENT_ID,
            scopes: ['openid', 'profile', 'email'],
            redirectUri: AuthSession.makeRedirectUri(),
            usePKCE: true,
          },
          discovery
        );

        if (mounted.current) {
          setRequest(req);
          setResponse(resp);
          setPromptAsync(prompt);
          setInitialized(true);
        }
      } catch (e) {
        console.warn('Google Sign-In init failed', e);
        if (mounted.current) setConfigError('Google Sign-In unavailable');
      }
    };

    initAuth();
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
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
    if (configError) {
      Alert.alert('Not available', configError);
      return;
    }
    if (!initialized) {
      Alert.alert('Please wait', 'Google Sign-In is still initializing...');
      return;
    }
    if (!request) {
      Alert.alert('Not ready', 'Google Sign-In is not ready. Try again.');
      return;
    }
    await promptAsync();
  };

  if (!initialized) {
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