import Constants from 'expo-constants';

// Base URL for the Rust backend
// Android emulator: 10.0.2.2 maps to host localhost
// Physical device: use your machine's LAN IP
const getApiUrl = () => {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv;
  const fromConfig = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  if (fromConfig) return fromConfig;
  return 'https://chatly-pxeb.onrender.com';
};

const getWsUrl = () => {
  const fromEnv = process.env.EXPO_PUBLIC_WS_URL;
  if (fromEnv) return fromEnv;
  const fromConfig = Constants.expoConfig?.extra?.wsUrl as string | undefined;
  if (fromConfig) return fromConfig;
  return 'wss://chatly-pxeb.onrender.com/ws';
};

export const API_URL = getApiUrl();
export const WS_URL = getWsUrl();
export const MEDIA_URL = (path: string) =>
  path.startsWith('http') ? path : `${API_URL}${path}`;

// Google OAuth client ID (used by "Sign in with Google").
// For Expo Go, use a "Web application" client ID and add the Expo Go redirect
// URI to it. Leave empty to disable the button.
export const GOOGLE_CLIENT_ID =
  (Constants.expoConfig?.extra?.googleClientId as string | undefined) || '';

export const STUN_SERVERS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun.services.mozilla.com',
];

// You can add your own TURN servers here for better NAT traversal in Nepal
export const TURN_SERVERS: RTCIceServer[] = [
  ...STUN_SERVERS.map((urls) => ({ urls })),
];

export const ICE_SERVERS: RTCIceServer[] = TURN_SERVERS;