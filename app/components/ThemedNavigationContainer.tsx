import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { navigationTheme } from '../styles/theme';

interface Props {
  children: React.ReactNode;
}

export function ThemedNavigationContainer({ children }: Props) {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? navigationTheme.dark : navigationTheme.light;
  
  return <NavigationContainer theme={theme}>{children}</NavigationContainer>;
}

// Export as default for expo-router compatibility
export default ThemedNavigationContainer;
