import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';
import { LightColors, DarkColors, ThemeColors } from './colors';
import { Typography } from './typography';

interface ThemeContextType {
  isDark: boolean;
  colors: ThemeColors;
  typography: typeof Typography;
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  themeMode: 'light' | 'dark' | 'system';
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  colors: LightColors,
  typography: Typography,
  setThemeMode: () => {},
  themeMode: 'system',
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('light');

  const isDark = themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? DarkColors : LightColors;

  return (
    <ThemeContext.Provider value={{ isDark, colors, typography: Typography, setThemeMode, themeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
export * from './colors';
export * from './typography';
