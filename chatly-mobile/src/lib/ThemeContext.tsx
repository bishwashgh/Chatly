import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { colors, darkColors } from './theme';

type ThemeContextValue = {
  isDark: boolean;
  colors: typeof colors;
  setDarkMode: (value: boolean) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [override, setOverride] = useState<boolean | null>(null);
  const isDark = override ?? systemScheme === 'dark';
  const palette = useMemo(() => (isDark ? darkColors : colors), [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, colors: palette, setDarkMode: (value) => setOverride(value) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
