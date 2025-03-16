import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StandardHeader } from './components/StandardHeader';
import { Card } from './components/Card';
import { Button } from './components/Button';
import { TextInputField } from './components/TextInputField';
import { colors, spacing, shadows, borderRadius } from './styles/theme';
import { addLog } from '../utils/logging';
import { useDevices } from './contexts/DeviceContext';
import { DeviceData } from '../types/devices';
import { getDevices, updateDevice } from '../utils/deviceStorage';
import { mapIoniconName } from './utils/iconMapping';

export default function Step2Page() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { activeDevice, refreshDevices } = useDevices();
  const [device, setDevice] = useState<DeviceData | null>(null);
  const [unitNumber, setUnitNumber] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load data based on device context or params
  useEffect(() => {
    if (params.deviceId) {
      loadDeviceById(String(params.deviceId));
    } else if (activeDevice) {
      setDevice(activeDevice);
      setUnitNumber(activeDevice.unitNumber);
      setPassword(activeDevice.password);
    } else {
      loadLegacySettings();
    }
  }, [params.deviceId, activeDevice]);

  const loadDeviceById = async (deviceId: string) => {
    try {
      const devices = await getDevices();
      const foundDevice = devices.find(d => d.id === deviceId);
      
      if (foundDevice) {
        setDevice(foundDevice);
        setUnitNumber(foundDevice.unitNumber);
        setPassword(foundDevice.password);
      }
    } catch (error) {
      console.error('Failed to load device:', error);
    }
  };

  const loadLegacySettings = async () => {
    try {
      const savedUnitNumber = await AsyncStorage.getItem('unitNumber');
      const savedPassword = await AsyncStorage.getItem('password');

      if (savedUnitNumber) setUnitNumber(savedUnitNumber);
      if (savedPassword) setPassword(savedPassword);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveToLocalStorage = async (newPwd: string): Promise<boolean> => {
    try {
      // Update device if available, otherwise use legacy storage
      if (device) {
        const updatedDevice = {
          ...device,
          password: newPwd
        };
        await updateDevice(updatedDevice);
        await refreshDevices();
      } else {
        await AsyncStorage.setItem('password', newPwd);
      }
      
      // Mark step as completed
      const savedCompletedSteps = await AsyncStorage.getItem('completedSteps');
      let completedSteps = savedCompletedSteps ? JSON.parse(savedCompletedSteps) : [];
      
      if (!completedSteps.includes('step2')) {
        completedSteps.push('step2');
        await AsyncStorage.setItem('completedSteps', JSON.stringify(completedSteps));
      }
      
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  };

  const sendSMS = async (command) => {
    if (!unitNumber) {
      Alert.alert('Error', 'GSM relay number not set. Please configure in Settings first.');
      await addLog('Password Change', 'Failed: GSM relay number not set', false);
      return false;
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
        Alert.alert(
          'Error',
          'SMS is not available on this device. Please ensure an SMS app is installed.',
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        await addLog('Password Change', 'Failed: SMS not available on device', false);
        return false;
      }

      await Linking.openURL(smsUrl);
      
      // Extract new password from command (format: oldPwdPnewPwd)
      const newPwdMatch = command.match(/\d{4}P(\d{4})/);
      const newPwd = newPwdMatch ? newPwdMatch[1] : "****";
      
      // Log password change with masked passwords
      await addLog(
        'Password Change', 
        `Changed device password to ${newPwd}`, 
        true
      );
      
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Failed to send SMS:', error);
      await addLog('Password Change', `Error: ${error.message}`, false);
      setIsLoading(false);
      return false;
    }
  };

  // Change Password
  const changePassword = async () => {
    // Validate inputs
    if (!newPassword || newPassword.length !== 4 || !/^\d+$/.test(newPassword)) {
      Alert.alert('Error', 'New password must be 4 digits');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    // Send SMS command to change password
    const smsSent = await sendSMS(`${password}P${newPassword}`);
    
    if (smsSent) {
      // Update local storage with new password
      const savedSuccessfully = await saveToLocalStorage(newPassword);
      
      if (savedSuccessfully) {
        setPassword(newPassword);
        setNewPassword('');
        setConfirmPassword('');
        
        // Show success message and navigate back to setup
        Alert.alert(
          'Success',
          'Password change command sent. The GSM relay password has been updated.',
          [{ text: 'OK', onPress: () => router.push('/setup') }]
        );
      } else {
        Alert.alert(
          'Warning',
          'Command sent but failed to save password locally. You may need to update it in settings.'
        );
      }
    }
  };

  return (
    <View style={styles.container}>
      <StandardHeader showBack backTo="/setup" />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Card title="Change Admin Password" subtitle="Update the 4-digit password for the GSM relay" elevated>
          <View style={styles.infoContainer}>
            <Ionicons name={mapIoniconName("information-circle-outline")} size={24} color={colors.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>
              This will change the password on your GSM relay device. Make sure to remember your new password.
            </Text>
          </View>

          <TextInputField
            label="Current Password"
            value={password}
            editable={false}
            containerStyle={styles.inputContainer}
          />

          <TextInputField
            label="New Password (4 digits)"
            value={newPassword}
            onChangeText={(text) => {
              // Only allow 4 digits
              const filtered = text.replace(/[^0-9]/g, '').slice(0, 4);
              setNewPassword(filtered);
            }}
            placeholder="Enter new 4-digit password"
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            containerStyle={styles.inputContainer}
          />

          <TextInputField
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={(text) => {
              // Only allow 4 digits
              const filtered = text.replace(/[^0-9]/g, '').slice(0, 4);
              setConfirmPassword(filtered);
            }}
            placeholder="Re-enter new password"
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            containerStyle={styles.inputContainer}
            error={
              confirmPassword && newPassword !== confirmPassword 
                ? "Passwords don't match" 
                : undefined
            }
            touched={!!confirmPassword}
          />

          <Button
            title="Update Password"
            onPress={changePassword}
            loading={isLoading}
            disabled={!newPassword || newPassword.length !== 4 || newPassword !== confirmPassword}
            style={styles.updateButton}
            fullWidth
          />

          <Button
            title="Cancel"
            onPress={() => router.push('/setup')}
            variant="outline"
            style={styles.cancelButton}
            fullWidth
          />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: `${colors.primary}15`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: spacing.sm,
  },
  updateButton: {
    marginTop: spacing.md,
  },
  cancelButton: {
    marginTop: spacing.sm,
  },
});
