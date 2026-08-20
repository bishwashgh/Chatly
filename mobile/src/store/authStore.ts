import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setAuthToken, User } from '../services/api';
import { wsService } from '../services/websocket';

const TOKEN_KEY = 'nepal_chat_token';

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { username: string; email: string; password: string; display_name: string; phone?: string; avatar_url?: string; otp_code?: string }) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) {
        setAuthToken(token);
        const user = await api.getMe();
        set({ token, user, isAuthenticated: true, isLoading: false });
        wsService.connect();
      } else {
        set({ isLoading: false, isAuthenticated: false });
      }
    } catch (e) {
      console.error('Auth initialize error', e);
      await AsyncStorage.removeItem(TOKEN_KEY);
      setAuthToken(null);
      set({ token: null, user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email, password) => {
    const res = await api.login({ email, password });
    await AsyncStorage.setItem(TOKEN_KEY, res.token);
    setAuthToken(res.token);
    set({ token: res.token, user: res.user, isAuthenticated: true });
    wsService.connect();
  },

  register: async (data) => {
    const res = await api.register(data);
    await AsyncStorage.setItem(TOKEN_KEY, res.token);
    setAuthToken(res.token);
    set({ token: res.token, user: res.user, isAuthenticated: true });
    wsService.connect();
  },

  googleLogin: async (idToken) => {
    const res = await api.googleSignIn(idToken);
    await AsyncStorage.setItem(TOKEN_KEY, res.token);
    setAuthToken(res.token);
    set({ token: res.token, user: res.user, isAuthenticated: true });
    wsService.connect();
  },

  logout: async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    wsService.disconnect();
    setAuthToken(null);
    set({ token: null, user: null, isAuthenticated: false });
  },

  updateUser: (user) => set({ user }),
}));