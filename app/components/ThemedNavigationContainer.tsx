import React from 'react';
import { useNavigationContainerTheme } from '@react-navigation/native';
import { navigationTheme } from '../styles/theme';
import { useTheme } from '../contexts/ThemeContext';

// This component doesn't wrap in NavigationContainer anymore
// Instead it just provides theme context to the existing container
export function useThemedNavigation() {
  const { theme } = useTheme();
  const currentTheme = theme === 'dark' ? navigationTheme.dark : navigationTheme.light;
  
  return currentTheme;
}

// Keep this for backwards compatibility but make it a simple wrapper
export function ThemedNavigationContainer({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
