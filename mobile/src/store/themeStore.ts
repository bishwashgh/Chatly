import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors as lightColors, darkColors, ThemeColors } from '../theme';

const STORAGE_KEY = 'chatly_theme';

interface ThemeState {
  isDark: boolean;
  colors: ThemeColors;
  hydrated: boolean;
  toggleDark: () => void;
  setDark: (dark: boolean) => void;
  hydrate: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: false,
  colors: lightColors,
  hydrated: false,

  toggleDark: () => get().setDark(!get().isDark),

  setDark: (dark) => {
    set({ isDark: dark, colors: dark ? darkColors : lightColors });
    AsyncStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light').catch(() => {});
  },

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const dark = stored === 'dark';
      set({ isDark: dark, colors: dark ? darkColors : lightColors, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
}));

export const useTheme = () => {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = useThemeStore((s) => s.colors);
  const toggleDark = useThemeStore((s) => s.toggleDark);
  const setDark = useThemeStore((s) => s.setDark);
  return { colors, isDark, toggleDark, setDark };
};