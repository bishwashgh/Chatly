const ACCESS_TOKEN_KEY = 'chatly_web_access_token';
const REFRESH_TOKEN_KEY = 'chatly_web_refresh_token';

/**
 * localStorage can throw in private browsing modes or when storage is
 * unavailable. Fall back to memory so the session still works for the tab.
 */
const memoryStore = new Map<string, string>();

function read(key: string): string | null {
  try {
    const value = window.localStorage.getItem(key);
    if (value !== null) return value;
  } catch {
    // ignore and fall through to the in-memory value
  }
  return memoryStore.get(key) ?? null;
}

function write(key: string, value: string): void {
  memoryStore.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // in-memory copy already holds the value
  }
}

function remove(key: string): void {
  memoryStore.delete(key);
  try {
    window.localStorage.removeItem(key);
  } catch {
    // nothing else to clean up
  }
}

export const tokenStorage = {
  getAccessToken(): string | null {
    return read(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    return read(REFRESH_TOKEN_KEY);
  },

  setTokens(accessToken: string, refreshToken: string): void {
    write(ACCESS_TOKEN_KEY, accessToken);
    write(REFRESH_TOKEN_KEY, refreshToken);
  },

  clear(): void {
    remove(ACCESS_TOKEN_KEY);
    remove(REFRESH_TOKEN_KEY);
  },
};
