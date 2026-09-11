import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { apolloClient, setAuthFailureHandler } from '../lib/apollo';
import { tokenStorage } from '../lib/tokenStorage';
import { ME_QUERY } from '../graphql/operations';
import type { AuthPayload, ChatUser } from '../lib/types';

type AuthContextValue = {
  currentUser: ChatUser | null;
  /** True while the stored session is being validated on first load. */
  restoring: boolean;
  signIn: (payload: AuthPayload) => Promise<void>;
  signOut: () => Promise<void>;
  setCurrentUser: (user: ChatUser) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setUser] = useState<ChatUser | null>(null);
  const [restoring, setRestoring] = useState(true);

  const signOut = useCallback(async () => {
    tokenStorage.clear();
    setUser(null);
    try {
      await apolloClient.clearStore();
      // Drop the cached socket so the next sign-in connects with a fresh token.
      await apolloClient.resetStore();
    } catch {
      // Nothing else to clean up if the store is already empty.
    }
  }, []);

  const signIn = useCallback(async (payload: AuthPayload) => {
    tokenStorage.setTokens(payload.accessToken, payload.refreshToken);
    setUser(payload.user);
  }, []);

  const setCurrentUser = useCallback((user: ChatUser) => {
    setUser(user);
  }, []);

  // The refresh flow cannot recover, so end the session cleanly.
  useEffect(() => {
    setAuthFailureHandler(() => {
      void signOut();
    });
    return () => setAuthFailureHandler(null);
  }, [signOut]);

  // Restore a session from stored tokens on first paint.
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      if (!tokenStorage.getAccessToken() && !tokenStorage.getRefreshToken()) {
        if (!cancelled) setRestoring(false);
        return;
      }

      try {
        const { data } = await apolloClient.query({
          query: ME_QUERY,
          fetchPolicy: 'network-only',
        });
        if (!cancelled) setUser(data?.me ?? null);
      } catch {
        if (!cancelled) {
          tokenStorage.clear();
          setUser(null);
        }
      } finally {
        if (!cancelled) setRestoring(false);
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ currentUser, restoring, signIn, signOut, setCurrentUser }),
    [currentUser, restoring, signIn, signOut, setCurrentUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
}
