import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Alert, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Linking, Platform } from 'react-native';
import { spacing, shadows, borderRadius } from '../styles/theme';
import { useTheme } from '../contexts/ThemeContext';
import { logGateOperation } from '../utils/logger';
import { Card } from '../components/Card';

export default function ControlPage() {
  const [unitNumber, setUnitNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { colors, isDarkMode } = useTheme();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const storedUnitNumber = await AsyncStorage.getItem('unitNumber');
      const storedPassword = await AsyncStorage.getItem('password');

      if (storedUnitNumber) setUnitNumber(storedUnitNumber);
      if (storedPassword) setPassword(storedPassword);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const sendCommand = async (command: string, operation: 'Open' | 'Close') => {
    if (!unitNumber) {
      Alert.alert('Error', 'GSM relay number not set. Please configure in Settings first.');
      await logGateOperation(operation, false, 'Failed: GSM relay number not set');
      return;
    }

    setIsLoading(true);

    try {
      const formattedUnitNumber = Platform.OS === 'ios' ? unitNumber.replace('+', '') : unitNumber;

      const smsUrl = Platform.select({
        ios: `sms:${formattedUnitNumber}&body=${encodeURIComponent(command)}`,
        android: `sms:${formattedUnitNumber}?body=${encodeURIComponent(command)}`,
        default: `sms:${formattedUnitNumber}?body=${encodeURIComponent(command)}`,
      });

      const supported = await Linking.canOpenURL(smsUrl);
      
      if (!supported) {
        Alert.alert('Error', 'SMS is not available on this device');
        await logGateOperation(operation, false, 'SMS is not available on this device');
        setIsLoading(false);
        return;
      }

      await Linking.openURL(smsUrl);
      
      // Log the operation
      await logGateOperation(operation, true);
      
      setIsLoading(false);
    } catch (error) {
      console.error(`Failed to send ${operation} command:`, error);
      await logGateOperation(operation, false, `Error: ${error.message}`);
      Alert.alert('Error', `Failed to send ${operation} command: ${error.message}`);
      setIsLoading(false);
    }
  };

  const openGate = () => {
    // Command to open gate
    sendCommand(`${password}ON#`, 'Open');
  };

  const closeGate = () => {
    // Command to close gate
    sendCommand(`${password}OFF#`, 'Close');
  };

  // Use dynamic styles based on theme
  const dynamicStyles = {
    container: {
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.surface,
    },
    text: {
      color: colors.text.primary,
    }
  };

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      {/* Header */}
      <View style={[styles.header, dynamicStyles.header]}>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Control</Text>
      </View>

      <View style={styles.content}>
        <Card title="Gate Control" elevated>
          <Text style={[styles.controlText, { color: colors.text.secondary }]}>
            Control your gate with a single tap
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.controlButton, styles.openButton]}
              onPress={openGate}
              disabled={isLoading}
            >
              <Ionicons name="lock-open-outline" size={32} color="white" />
              <Text style={styles.buttonText}>Open Gate</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.controlButton, styles.closeButton]}
              onPress={closeGate}
              disabled={isLoading}
            >
              <Ionicons name="lock-closed-outline" size={32} color="white" />
              <Text style={styles.buttonText}>Close Gate</Text>
            </TouchableOpacity>
          </View>

          {!unitNumber && (
            <View style={styles.warningContainer}>
              <Ionicons name="warning-outline" size={24} color={colors.warning} />
              <Text style={[styles.warningText, { color: colors.warning }]}>
                Please set your GSM relay number in Settings
              </Text>
            </View>
          )}
        </Card>

        <Card title="Recent Activity">
          <TouchableOpacity 
            style={styles.viewLogsButton}
            onPress={() => {
              // Navigate to logs tab
            }}
          >
            <Text style={{ color: colors.primary }}>View Logs</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    ...shadows.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  controlText: {
    fontSize: 16,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: spacing.md,
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '45%',
    ...shadows.md,
  },
  openButton: {
    backgroundColor: '#4CAF50',
  },
  closeButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  warningText: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  viewLogsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
});
