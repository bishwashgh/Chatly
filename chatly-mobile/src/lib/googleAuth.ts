import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  offlineAccess: true,
});

export async function signInWithGoogle() {
  await GoogleSignin.hasPlayServices();
  const userInfo = await GoogleSignin.signIn();
  const { idToken } = await GoogleSignin.getTokens();
  return { idToken, userInfo };
}

export async function signOutGoogle() {
  await GoogleSignin.signOut();
}
