import React from 'react';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from './contexts/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DeviceProvider } from './contexts/DeviceContext';
import { DataStoreProvider } from './contexts/DataStoreContext';
import { debugDataStore } from '../utils/debugTools';
import { DataStoreSyncMonitor } from './components/DataStoreSyncMonitor';
import { View, StyleSheet } from 'react-native';
import { StandardHeader } from './components/StandardHeader';
import { useTheme } from './contexts/ThemeContext';
import '../utils/asyncStorageDebug';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

export default function RootLayout() {
  const { colors } = useTheme();

  useEffect(() => {
    window.frameworkReady?.();
    
    // Debug DataStore during app startup
    setTimeout(() => {
      debugDataStore().then(result => {
        console.log('DataStore initialized status:', result ? 'SUCCESS' : 'FAILED');
      });
    }, 2000);
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <DataStoreProvider>
          <DeviceProvider>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
              <DataStoreSyncMonitor />
              <Stack
                screenOptions={{
                  // Hide the default header since we're using StandardHeader
                  headerShown: false,
                  
                  // Animation settings
                  animation: 'slide_from_right',
                  
                  // Content style (apply padding to account for header height)
                  contentStyle: {
                    backgroundColor: colors.background,
                  },
                }}
              >
                <Stack.Screen name="+not-found" />
              </Stack>
              <StatusBar style="auto" />
            </View>
          </DeviceProvider>
        </DataStoreProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
