import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, darkColors } from '../styles/theme';

// Define theme types
export type ThemeType = 'light' | 'dark';

// Define context type
type ThemeContextType = {
  theme: ThemeType;
  colors: typeof colors | typeof darkColors;
  isDarkMode: boolean;
  toggleTheme: () => void;
  setDarkMode: (isDark: boolean) => void;
};

// Create context with default values
const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  colors: colors,
  isDarkMode: false,
  toggleTheme: () => {},
  setDarkMode: () => {},
});

// Hook for using theme context
export const useTheme = () => useContext(ThemeContext);

// Provider component
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const deviceTheme = useColorScheme();
  const [theme, setTheme] = useState<ThemeType>('light');
  
  // Load theme preference from storage on mount
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const storedDarkMode = await AsyncStorage.getItem('darkMode');
        if (storedDarkMode !== null) {
          setTheme(storedDarkMode === 'true' ? 'dark' : 'light');
        } else {
          // Use device theme as default if no saved preference
          setTheme(deviceTheme === 'dark' ? 'dark' : 'light');
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      }
    };
    
    loadThemePreference();
  }, [deviceTheme]);
  
  // Toggle theme function
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    AsyncStorage.setItem('darkMode', (newTheme === 'dark').toString());
  };
  
  // Set dark mode directly
  const setDarkMode = (isDark: boolean) => {
    setTheme(isDark ? 'dark' : 'light');
    AsyncStorage.setItem('darkMode', isDark.toString());
  };
  
  const currentColors = theme === 'dark' ? darkColors : colors;
  
  return (
    <ThemeContext.Provider
      value={{
        theme,
        colors: currentColors,
        isDarkMode: theme === 'dark',
        toggleTheme,
        setDarkMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// Export default for expo-router compatibility
export default ThemeProvider;
