import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useMutation, useApolloClient } from '@apollo/client';
import { tokenStorage } from './secureStore';
import { LOGIN_WITH_GOOGLE, ME_QUERY } from '../graphql/auth.gql';
import { signInWithGoogle, signOutGoogle } from './googleAuth';
import { setAuthFailureHandler } from './apolloClient';

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  name: string;
  bio?: string;
  avatarUrl?: string;
  isActive?: boolean;
};

type AuthContextValue = {
  currentUser: AuthUser | null;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<AuthUser>) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const client = useApolloClient();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginMutation] = useMutation(LOGIN_WITH_GOOGLE);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const token = await tokenStorage.getAccessToken();
      if (!token) {
        if (!cancelled) setIsLoading(false);
        return;
      }
      try {
        const { data } = await client.query({ query: ME_QUERY, fetchPolicy: 'network-only' });
        if (!cancelled && data?.me) {
          setCurrentUser(data.me);
        } else {
          await tokenStorage.clear();
        }
      } catch {
        // Token invalid/expired — drop the session; the refresh link will handle live 401s.
        await tokenStorage.clear();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    const handler = () => setCurrentUser(null);
    setAuthFailureHandler(handler);
    return () => {
      cancelled = true;
      setAuthFailureHandler(null);
    };
  }, [client]);

  const loginWithGoogle = useCallback(async () => {
    const { idToken } = await signInWithGoogle();
    const { data } = await loginMutation({ variables: { idToken } });
    const payload = data?.loginWithGoogle;
    if (!payload) {
      throw new Error('Sign in failed');
    }
    await tokenStorage.setTokens(payload.accessToken, payload.refreshToken);
    setCurrentUser(payload.user);
  }, [loginMutation]);

  const logout = useCallback(async () => {
    await tokenStorage.clear();
    await signOutGoogle();
    await client.clearStore();
    setCurrentUser(null);
  }, [client]);

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setCurrentUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, loginWithGoogle, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}