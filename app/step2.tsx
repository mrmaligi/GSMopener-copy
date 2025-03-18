import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, Platform, Linking, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StandardHeader } from './components/StandardHeader';
import { Card } from './components/Card';
import { Button } from './components/Button';
import { TextInputField } from './components/TextInputField';
import { colors, spacing, shadows, borderRadius } from './styles/theme';
import { useDevices } from './contexts/DeviceContext';
import { DeviceData } from '../types/devices';
import { mapIoniconName } from './utils/iconMapping';
import { useDataStore } from './contexts/DataStoreContext';

export default function Step2Page() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { activeDevice, refreshDevices } = useDevices();
  const [device, setDevice] = useState<DeviceData | null>(null);
  const [unitNumber, setUnitNumber] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Use our DataStore with all needed methods
  const { 
    store, 
    isLoading: storeLoading,
    getDeviceById, 
    updateDevice, 
    addDeviceLog,
    logSMSOperation,
    updateGlobalSettings,
    refreshStore
  } = useDataStore();

  // Load data based on device context or params
  const loadDeviceData = useCallback(async () => {
    // If store is still loading, wait
    if (storeLoading) {
      return;
    }
    
    setIsLoadingData(true);
    console.log("Step2: Loading device data...");
    
    try {
      // Ensure we have latest data
      await refreshStore();
      
      let currentDeviceId: string | undefined = undefined;
      
      if (params.deviceId) {
        currentDeviceId = String(params.deviceId);
        console.log(`Step2: Loading device by ID: ${currentDeviceId}`);
        await loadDeviceById(currentDeviceId);
      } else if (activeDevice) {
        console.log(`Step2: Using active device: ${activeDevice.id}`);
        currentDeviceId = activeDevice.id;
        setDevice(activeDevice);
        setUnitNumber(activeDevice.unitNumber);
        setCurrentPassword(activeDevice.password);
      } else {
        console.log("Step2: No device found");
      }
      
      setDeviceId(currentDeviceId);
    } catch (error) {
      console.error('Step2: Failed to load device data:', error);
      Alert.alert('Error', 'Failed to load device data. Please try again.');
    } finally {
      setIsLoadingData(false);
    }
  }, [storeLoading, params.deviceId, activeDevice, refreshStore]);
  
  // Load device data when dependencies change
  useEffect(() => {
    loadDeviceData();
  }, [loadDeviceData]);

  const loadDeviceById = async (deviceId: string) => {
    try {
      const foundDevice = getDeviceById(deviceId);
      
      if (foundDevice) {
        setDevice({
          ...foundDevice,
          id: foundDevice.id,
          type: 'Connect4v', // Ensure it matches DeviceData type
          isActive: store.globalSettings.activeDeviceId === foundDevice.id
        } as DeviceData);
        
        setUnitNumber(foundDevice.unitNumber);
        setCurrentPassword(foundDevice.password);
      }
    } catch (error) {
      console.error('Failed to load device:', error);
    }
  };

  const validatePasswords = () => {
    if (!newPassword) {
      Alert.alert('Error', 'Please enter a new password');
      return false;
    }
    
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    
    if (newPassword.length !== 4 || !/^\d+$/.test(newPassword)) {
      Alert.alert('Error', 'Password must be exactly 4 digits');
      return false;
    }
    
    return true;
  };

  const savePassword = async () => {
    if (!validatePasswords() || !deviceId) return;

    try {
      // Update device with new password
      const updatedDevice = await updateDevice(deviceId, {
        password: newPassword
      });
      
      if (updatedDevice) {
        await refreshDevices();
        
        // Mark step as completed
        await updateGlobalSettings({ 
          completedSteps: store.globalSettings.completedSteps.includes('step2') 
            ? store.globalSettings.completedSteps 
            : [...store.globalSettings.completedSteps, 'step2']
        });
      }
      
      // Add log
      await addDeviceLog(
        deviceId,
        'Password Change',
        'Device password updated in app',
        true
      );

      // Now automatically send the command to update the device
      sendPasswordChangeCommand();
      
    } catch (error) {
      console.error('Failed to save password:', error);
      Alert.alert('Error', 'Failed to save new password');
    }
  };

  const sendPasswordChangeCommand = () => {
    if (!unitNumber || !currentPassword || !newPassword) {
      Alert.alert('Error', 'Missing required information');
      return;
    }

    // Format: current-password P new-password new-password #
    const command = `${currentPassword}P${newPassword}${newPassword}#`;
    sendSMS(command);
  };

  const sendSMS = async (command: string) => {
    if (!unitNumber) {
      Alert.alert('Error', 'Please enter the GSM relay number first');
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
        Alert.alert(
          'Error',
          'SMS is not available on this device. Please ensure an SMS app is installed.',
          [{ text: 'OK' }]
        );
        
        if (deviceId) {
          await addDeviceLog(
            deviceId,
            'Password Change', 
            'Failed: SMS not available on device', 
            false,
            'settings'
          );
        }
        return;
      }

      await Linking.openURL(smsUrl);
      
      // Use the logSMSOperation function for consistent logging
      if (deviceId) {
        await logSMSOperation(deviceId, command);
      }
    } catch (error) {
      console.error('Failed to send SMS:', error);
      Alert.alert(
        'Error',
        'Failed to open SMS. Please try again.',
        [{ text: 'OK' }]
      );
      
      if (deviceId) {
        await addDeviceLog(
          deviceId,
          'Password Change', 
          `Error: ${error.message}`, 
          false,
          'settings'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StandardHeader showBack backTo="/setup" />
      
      {(storeLoading || isLoadingData) ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <Card title="Change Device Password" elevated>
            <View style={styles.infoContainer}>
              <Ionicons name={mapIoniconName("information-circle-outline")} size={24} color={colors.primary} style={styles.infoIcon} />
              <Text style={styles.infoText}>
                Change your GSM relay password. Password must be 4 digits. This will update both the app and the device.
              </Text>
            </View>
            
            <TextInputField
              label="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Current 4-digit password"
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              editable={false}
              info="Your current password as stored in the app"
            />
            
            <TextInputField
              label="New Password"
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
            />
            
            <TextInputField
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={(text) => {
                // Only allow 4 digits
                const filtered = text.replace(/[^0-9]/g, '').slice(0, 4);
                setConfirmPassword(filtered);
              }}
              placeholder="Enter new password again"
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              error={newPassword && confirmPassword && newPassword !== confirmPassword ? "Passwords don't match" : undefined}
            />
            
            <Button
              title="Change Password"
              onPress={savePassword}
              disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length !== 4}
              icon={<Ionicons name="key-outline" size={20} color="white" />}
              style={styles.changeButton}
              loading={isLoading}
              fullWidth
            />
          </Card>
          
          <Card title="Password Requirements" style={styles.helpCard}>
            <View style={styles.helpItem}>
              <Ionicons name={mapIoniconName("information-circle-outline")} size={24} color={colors.primary} style={styles.helpIcon} />
              <Text style={styles.helpText}>
                The password must be exactly 4 digits (0-9).
              </Text>
            </View>
            
            <View style={styles.helpItem}>
              <Ionicons name={mapIoniconName("warning-outline")} size={24} color={colors.warning} style={styles.helpIcon} />
              <Text style={styles.helpText}>
                After changing the password, all authorized users must use the new password when sending commands.
              </Text>
            </View>
          </Card>
          
          <Button
            title="Continue to User Management"
            variant="secondary"
            onPress={() => router.push({
              pathname: '/step3',
              params: deviceId ? { deviceId } : {}
            })}
            style={styles.nextButton}
            icon={<Ionicons name={mapIoniconName("arrow-forward")} size={20} color={colors.primary} />}
            fullWidth
          />
        </ScrollView>
      )}
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
    paddingBottom: spacing.xxl,
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
  buttonContainer: {
    marginTop: spacing.md,
  },
  saveButton: {
    marginBottom: spacing.md,
  },
  changeButton: {
    marginBottom: spacing.sm,
  },
  stepText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  helpCard: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  helpIcon: {
    marginRight: spacing.md,
    marginTop: 2,
  },
  helpText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  nextButton: {
    marginBottom: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.text.secondary,
  },
});
