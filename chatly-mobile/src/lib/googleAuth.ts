import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

// This must be the Web OAuth client from the same Google Cloud project as the
// backend's GOOGLE_CLIENT_ID. The Android OAuth client is additionally matched
// by Google Play services using this app's package name and signing SHA-1.
GoogleSignin.configure({
  webClientId,
  offlineAccess: true,
});

export async function signInWithGoogle() {
  if (!webClientId || !webClientId.endsWith('.apps.googleusercontent.com')) {
    throw new Error('Google Sign-In is not configured. Add the Web OAuth client ID to EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID and rebuild the app.');
  }

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const userInfo = await GoogleSignin.signIn();
    const { idToken } = await GoogleSignin.getTokens();
    if (!idToken) {
      throw new Error('Google did not return an ID token. Please try again.');
    }
    return { idToken, userInfo };
  } catch (error: any) {
    if (error?.code === 'DEVELOPER_ERROR') {
      throw new Error('Google rejected this app build. In Google Cloud, add package com.chatly.app with this build’s SHA-1 certificate, then rebuild and reinstall.');
    }
    if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Google Play services is unavailable or needs an update on this device.');
    }
    throw error;
  }
}

export async function signOutGoogle() {
  await GoogleSignin.signOut();
}
