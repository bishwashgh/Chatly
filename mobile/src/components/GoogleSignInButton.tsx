import React from 'react';
import { Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassButton } from './GlassButton';
import { useGoogleAuthRequest, extractGoogleIdToken } from '../services/googleAuth';
import { GOOGLE_CLIENT_ID } from '../config';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../store/themeStore';

export function GoogleSignInButton() {
  const { colors } = useTheme();
  const googleLogin = useAuthStore((s) => s.googleLogin);
  const [request, response, promptAsync] = useGoogleAuthRequest();
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (response?.type === 'success') {
      const idToken = extractGoogleIdToken(response);
      if (idToken) {
        setLoading(true);
        googleLogin(idToken)
          .catch((e: any) => Alert.alert('Sign in failed', e.message || 'Could not sign in with Google.'))
          .finally(() => setLoading(false));
      }
    } else if (response?.type === 'error') {
      Alert.alert('Sign in failed', 'Google sign-in was interrupted.');
    }
  }, [response]);

  const handlePress = async () => {
    if (!GOOGLE_CLIENT_ID) {
      Alert.alert(
        'Not configured',
        'Google sign-in needs a Client ID. Set "googleClientId" in app.json extra (see config.ts).'
      );
      return;
    }
    if (!request) {
      Alert.alert('Not ready', 'Google sign-in is still initializing. Try again.');
      return;
    }
    await promptAsync();
  };

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