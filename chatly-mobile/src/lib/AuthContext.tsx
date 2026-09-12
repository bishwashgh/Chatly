import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useMutation, useApolloClient } from '@apollo/client';
import { tokenStorage } from './secureStore';
import { LOGIN_WITH_GOOGLE, ME_QUERY, SIGN_IN, VERIFY_SIGNUP } from '../graphql/auth.gql';
import { signInWithGoogle, signOutGoogle } from './googleAuth';
import { setAuthFailureHandler } from './apolloClient';

export type AuthUser = { id: string; email: string; username: string; name: string; bio?: string; avatarUrl?: string; isOnline?: boolean; lastSeen?: string; createdAt?: string; isActive?: boolean; friendGated?: boolean };
type AuthContextValue = {
  currentUser: AuthUser | null;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  verifySignup: (challengeId: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<AuthUser>) => void;
};
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const client = useApolloClient();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginMutation] = useMutation(LOGIN_WITH_GOOGLE);
  const [passwordMutation] = useMutation(SIGN_IN);
  const [verifyMutation] = useMutation(VERIFY_SIGNUP);

  const applyPayload = useCallback(async (payload: any) => {
    if (!payload) throw new Error('Authentication failed');
    await tokenStorage.setTokens(payload.accessToken, payload.refreshToken);
    setCurrentUser(payload.user);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await tokenStorage.getAccessToken();
      if (!token) { if (!cancelled) setIsLoading(false); return; }
      try {
        const { data } = await client.query({ query: ME_QUERY, fetchPolicy: 'network-only' });
        if (!cancelled && data?.me) setCurrentUser(data.me); else await tokenStorage.clear();
      } catch { await tokenStorage.clear(); }
      finally { if (!cancelled) setIsLoading(false); }
    })();
    const handler = () => setCurrentUser(null);
    setAuthFailureHandler(handler);
    return () => { cancelled = true; setAuthFailureHandler(null); };
  }, [client]);

  const loginWithGoogle = useCallback(async () => {
    const { idToken } = await signInWithGoogle();
    const { data } = await loginMutation({ variables: { idToken } });
    await applyPayload(data?.loginWithGoogle);
  }, [loginMutation, applyPayload]);

  const loginWithPassword = useCallback(async (email: string, password: string) => {
    const { data } = await passwordMutation({ variables: { input: { email: email.trim(), password } } });
    await applyPayload(data?.signIn);
  }, [passwordMutation, applyPayload]);

  const verifySignup = useCallback(async (challengeId: string, code: string) => {
    const { data } = await verifyMutation({ variables: { input: { challengeId, code } } });
    await applyPayload(data?.verifySignup);
  }, [verifyMutation, applyPayload]);

  const logout = useCallback(async () => {
    try {
      await tokenStorage.clear();
    } catch (e) {
      console.warn('tokenStorage.clear error:', e);
    }
    try {
      await signOutGoogle();
    } catch {
      /* Google may not be configured for password accounts. */
    }
    try {
      await client.clearStore();
    } catch {
      try {
        await client.resetStore();
      } catch {}
    }
    setCurrentUser(null);
  }, [client]);

  const updateUser = useCallback((patch: Partial<AuthUser>) => setCurrentUser((prev) => prev ? { ...prev, ...patch } : prev), []);

  return <AuthContext.Provider value={{ currentUser, isLoading, loginWithGoogle, loginWithPassword, verifySignup, logout, updateUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
