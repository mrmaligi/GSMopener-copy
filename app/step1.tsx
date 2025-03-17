import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, Platform, Linking } from 'react-native';
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

export default function Step1Page() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { activeDevice, refreshDevices } = useDevices();
  const [device, setDevice] = useState<DeviceData | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null); // Added deviceId state
  const [unitNumber, setUnitNumber] = useState('');
  const [password, setPassword] = useState('1234');
  const [adminNumber, setAdminNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deviceName, setDeviceName] = useState('My Gate Opener');

  // Use our DataStore with more complete methods
  const { 
    store, 
    isLoading: storeLoading,
    getDeviceById,
    addDevice, 
    updateDevice, 
    addDeviceLog,
    logSMSOperation, // Add this import 
    updateGlobalSettings,
    refreshStore 
  } = useDataStore();
  
  // Load data based on device context or params
  const loadData = useCallback(async () => {
    // Wait for store to be fully loaded
    if (storeLoading) {
      return;
    }

    try {
      // Refresh store to ensure we have latest data
      await refreshStore();

      if (params.deviceId) {
        const id = String(params.deviceId);
        setDeviceId(id); // Set deviceId when loading from params
        await loadDeviceById(id);
      } else if (activeDevice) {
        setDevice(activeDevice);
        setDeviceId(activeDevice.id); // Set deviceId from active device
        setUnitNumber(activeDevice.unitNumber);
        setPassword(activeDevice.password);
        setDeviceName(activeDevice.name || 'My Gate Opener');
        loadAdminNumber();
      } else {
        // No device yet - set defaults
        setDeviceId(null); // Clear deviceId
        setDeviceName('My Gate Opener');
        setPassword('1234');
        // Load admin number if available
        loadAdminNumber();
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    }
  }, [storeLoading, params.deviceId, activeDevice, refreshStore]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
        
        setDeviceId(foundDevice.id); // Set deviceId when loading device by id
        setUnitNumber(foundDevice.unitNumber);
        setPassword(foundDevice.password);
        setDeviceName(foundDevice.name || 'My Gate Opener');
        loadAdminNumber();
      }
    } catch (error) {
      console.error('Failed to load device:', error);
    }
  };

  const loadAdminNumber = () => {
    if (!storeLoading) {
      setAdminNumber(store.globalSettings.adminNumber || '');
    }
  };

  const saveToLocalStorage = async () => {
    try {
      // If we have a device, update it
      if (device) {
        console.log(`Step1: Updating device ${device.id}`);
        const updatedDevice = await updateDevice(device.id, {
          name: deviceName,
          unitNumber,
          password
        });
        
        if (updatedDevice) {
          await refreshDevices();
        }
      } else {
        // Create a new device
        console.log("Step1: Creating new device");
        const newDevice = await addDevice({
          name: deviceName,
          unitNumber: unitNumber,
          password: password,
          authorizedUsers: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        
        console.log(`Step1: New device created with ID: ${newDevice.id}`);
        
        // Set as active device if we don't have one
        if (!store.globalSettings.activeDeviceId) {
          await updateGlobalSettings({
            activeDeviceId: newDevice.id
          });
        }
        
        // Refresh devices list
        await refreshDevices();
      }
      
      // Update admin number in global settings
      await updateGlobalSettings({ 
        adminNumber: adminNumber,
        // Add step1 to completed steps if not already there
        completedSteps: store.globalSettings.completedSteps.includes('step1') 
          ? store.globalSettings.completedSteps 
          : [...store.globalSettings.completedSteps, 'step1']
      });
      
      // Refresh store to update UI
      await refreshStore();
      
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
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
        
        if (device) {
          await addDeviceLog(
            device.id,
            'Initial Setup', 
            'Failed: SMS not available on device', 
            false
          );
        }
        return;
      }

      await Linking.openURL(smsUrl);
      
      // Use the logSMSOperation function for consistent logging
      if (device) {
        await logSMSOperation(device.id, command, true);
      }
    } catch (error) {
      console.error('Failed to send SMS:', error);
      Alert.alert(
        'Error',
        'Failed to open SMS. Please try again.',
        [{ text: 'OK' }]
      );
      
      if (device) {
        await addDeviceLog(
          device.id,
          'Initial Setup', 
          `Error: ${error.message}`, 
          false
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const registerAdminNumber = () => {
    if (!unitNumber) {
      Alert.alert('Error', 'Please enter the GSM relay number first');
      return;
    }
    
    if (!adminNumber) {
      Alert.alert('Error', 'Please enter your admin phone number');
      return;
    }
    
    // Format the admin number to remove any non-digit characters
    let formattedAdminNumber = adminNumber.replace(/\D/g, '');
    
    // Make sure the number has the correct format with "00" prefix before country code
    if (formattedAdminNumber.startsWith('0')) {
      formattedAdminNumber = formattedAdminNumber.substring(1); // Remove leading 0 if exists
    }
    
    // Add "00" prefix if it's not already there
    if (!formattedAdminNumber.startsWith('00')) {
      formattedAdminNumber = '00' + formattedAdminNumber;
    }
    
    // Send the TEL command to register admin
    sendSMS(`${password}TEL${formattedAdminNumber}#`);
    
    // Save settings locally
    saveToLocalStorage();
  };

  const testConnection = () => {
    if (!unitNumber) {
      Alert.alert('Error', 'Please enter the GSM relay number first');
      return;
    }
    
    sendSMS(`${password}EE`);
  };

  return (
    <View style={styles.container}>
      <StandardHeader showBack backTo={deviceId ? "/devices" : "/setup"} />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Card title={device ? `Configure ${device.name}` : "Configure Your GSM Opener"} elevated>
          <View style={styles.infoContainer}>
            <Ionicons name={mapIoniconName("information-circle-outline")} size={24} color={colors.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>
              Enter the phone number of your GSM relay device and give it a name for easy identification.
            </Text>
          </View>
          
          {/* Only show Device Name Input if not already set from add device page */}
          {!device && (
            <TextInputField
              label="Device Name"
              value={deviceName}
              onChangeText={setDeviceName}
              placeholder="Enter a name for this device"
              containerStyle={styles.inputContainer}
            />
          )}
          
          <TextInputField
            label="GSM Relay Phone Number"
            value={unitNumber}
            onChangeText={setUnitNumber}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
            autoComplete="tel"
            containerStyle={styles.inputContainer}
          />
          
          <TextInputField
            label="Device Password"
            value={password}
            onChangeText={(text) => {
              // Only allow 4 digits
              const filtered = text.replace(/[^0-9]/g, '').slice(0, 4);
              setPassword(filtered);
            }}
            placeholder="Default is 1234"
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            containerStyle={styles.inputContainer}
          />
          
          <View style={styles.divider} />
          
          <View style={styles.adminRegistrationContainer}>
            <Text style={styles.sectionTitle}>Register Admin Number</Text>
            
            <View style={styles.infoContainer}>
              <Ionicons name={mapIoniconName("alert-circle-outline")} size={24} color={colors.warning} style={styles.infoIcon} />
              <Text style={styles.infoText}>
                Important: Register your phone as an administrator to control the relay.
                Number format example: 61469xxxxxx 
              </Text>
            </View>
            
            <TextInputField
              label="Your Admin Phone Number"
              value={adminNumber}
              onChangeText={setAdminNumber}
              placeholder="Enter your number (e.g., 0061469xxxxxx)"
              keyboardType="phone-pad"
              containerStyle={styles.inputContainer}
              info="Number must start with 00 followed by country code"
            />
            
            <Text style={styles.commandPreview}>
              Command: {password}TEL{adminNumber.replace(/\D/g, '').startsWith('00') ? 
                adminNumber.replace(/\D/g, '') : 
                '00' + adminNumber.replace(/\D/g, '')}#
            </Text>
            
            <Button
              title="Register Admin & Save Settings"
              onPress={registerAdminNumber}
              loading={isLoading}
              disabled={!adminNumber || !unitNumber}
              icon={<Ionicons name="key-outline" size={20} color="white" />}
              style={styles.registerButton}
              fullWidth
            />
          </View>
          
          <View style={styles.testConnectionContainer}>
            <Button
              title="Test Connection"
              variant="secondary"
              onPress={testConnection}
              loading={isLoading}
              disabled={!unitNumber}
              icon={<Ionicons name="pulse-outline" size={20} color={colors.primary} />}
              fullWidth
            />
          </View>
        </Card>
        
        <Card title="How It Works" style={styles.helpCard}>
          <View style={styles.helpItem}>
            <Ionicons name={mapIoniconName("phone-portrait-outline")} size={24} color={colors.primary} style={styles.helpIcon} />
            <Text style={styles.helpText}>
              The app communicates with your GSM relay device via SMS commands.
            </Text>
          </View>
          
          <View style={styles.helpItem}>
            <Ionicons name={mapIoniconName("shield-outline")} size={24} color={colors.primary} style={styles.helpIcon} />
            <Text style={styles.helpText}>
              Register your number as an administrator to maintain full control over the device.
            </Text>
          </View>
        </Card>
        
        <Button
          title="Continue to Change Password"
          variant="secondary"
          onPress={() => router.push({
            pathname: '/step2',
            params: deviceId ? { deviceId } : {}
          })}
          style={styles.continueButton}
          icon={<Ionicons name={mapIoniconName("arrow-forward")} size={20} color={colors.primary} />}
          fullWidth
        />
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
  inputContainer: {
    marginBottom: spacing.md,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  button: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  stepList: {
    marginTop: spacing.xs,
  },
  step: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    marginTop: 2,
  },
  stepNumberText: {
    color: colors.text.inverse,
    fontWeight: '600',
    fontSize: 14,
  },
  stepContent: {
    flex: 1,
  },
  stepText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  adminRegistrationContainer: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  registerButton: {
    marginTop: spacing.md,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
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
  commandPreview: {
    fontSize: 14,
    color: colors.text.secondary,
    backgroundColor: '#f0f0f0',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  continueButton: {
    marginBottom: spacing.xl,
  },
  testConnectionContainer: {
    marginTop: spacing.md,
  },
});
