const configuredLiveKitUrl = import.meta.env.VITE_LIVEKIT_URL;

/**
 * Only the bare websocket host is valid for the client SDK. A URL that also
 * contains an `/rtc` path, a query string or placeholder text will fail the
 * signal handshake, so reject it early with a clear reason.
 */
export function resolveLiveKitUrl(): string | null {
  const value = configuredLiveKitUrl?.trim();
  if (!value) return null;

  const hasValidProtocol = value.startsWith('wss://') || value.startsWith('ws://');
  const isPlaceholder = value.includes('your-') || value.includes('instance.livekit.cloud');
  const hasPath = value.slice('wss://'.length).includes('/');
  const hasQuery = value.includes('?') || value.includes('access_token');

  if (!hasValidProtocol || isPlaceholder || hasPath || hasQuery) {
    console.warn('[LiveKit] Ignoring invalid VITE_LIVEKIT_URL:', value);
    return null;
  }

  return value.replace(/\/+$/, '');
}

export const liveKitUrl = resolveLiveKitUrl();

export const isCallingConfigured = Boolean(liveKitUrl);
