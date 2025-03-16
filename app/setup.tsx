import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './components/Card';
import { Button } from './components/Button';
import { TextInputField } from './components/TextInputField';
import { colors, spacing, shadows, borderRadius } from './styles/theme';
import { addLog } from '../utils/logging';
import { StandardHeader } from './components/StandardHeader';
import { DeviceData } from '../types/devices';
import { getDevices, updateDevice } from '../utils/deviceStorage';
import { useDevices } from './contexts/DeviceContext';

export default function SetupPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { refreshDevices } = useDevices();
  const [unitNumber, setUnitNumber] = useState('');
  const [password, setPassword] = useState('1234'); // Default password
  const [adminNumber, setAdminNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [device, setDevice] = useState<DeviceData | null>(null);
  
  // Load device data if deviceId is provided
  useEffect(() => {
    if (params.deviceId) {
      loadDeviceData(String(params.deviceId));
    } else {
      loadLegacyData();
    }
  }, [params.deviceId]);

  const loadDeviceData = async (deviceId: string) => {
    try {
      const devices = await getDevices();
      const foundDevice = devices.find(d => d.id === deviceId);
      
      if (foundDevice) {
        setDevice(foundDevice);
        setUnitNumber(foundDevice.unitNumber);
        setPassword(foundDevice.password);
        // Admin number might be stored separately
        const savedAdminNumber = await AsyncStorage.getItem('adminNumber');
        if (savedAdminNumber) setAdminNumber(savedAdminNumber);
      }
    } catch (error) {
      console.error('Error loading device data:', error);
    }
  };

  const loadLegacyData = async () => {
    try {
      const savedUnitNumber = await AsyncStorage.getItem('unitNumber');
      const savedPassword = await AsyncStorage.getItem('password');
      const savedAdminNumber = await AsyncStorage.getItem('adminNumber');

      if (savedUnitNumber) setUnitNumber(savedUnitNumber);
      if (savedPassword) setPassword(savedPassword);
      if (savedAdminNumber) setAdminNumber(savedAdminNumber);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const saveToLocalStorage = async () => {
    try {
      // If we have a device, update it
      if (device) {
        const updatedDevice = {
          ...device,
          unitNumber,
          password
        };
        await updateDevice(updatedDevice);
        await refreshDevices();
      } else {
        // Otherwise use legacy storage
        await AsyncStorage.setItem('unitNumber', unitNumber);
        await AsyncStorage.setItem('password', password);
      }
      
      await AsyncStorage.setItem('adminNumber', adminNumber);
      
      // Mark step as completed
      const savedCompletedSteps = await AsyncStorage.getItem('completedSteps');
      let completedSteps = savedCompletedSteps ? JSON.parse(savedCompletedSteps) : [];
      
      if (!completedSteps.includes('step1')) {
        completedSteps.push('step1');
        await AsyncStorage.setItem('completedSteps', JSON.stringify(completedSteps));
      }
      
      Alert.alert(
        'Success', 
        'Device settings saved successfully',
        [{ text: 'OK', onPress: () => router.push('/setup') }]
      );
    } catch (error) {
      console.error('Error saving data:', error);
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
        await addLog('Initial Setup', 'Failed: SMS not available on device', false);
        return;
      }

      await Linking.openURL(smsUrl);
      
      // Log with specific action details based on command
      if (command.includes('TEL')) {
        // Extract phone number from command: pwdTELphone#
        const phoneMatch = command.match(/\d{4}TEL([0-9+]+)#/);
        const phone = phoneMatch ? phoneMatch[1] : adminNumber;
        await addLog(
          'Admin Registration', 
          `Registered admin number ${phone}`, 
          true
        );
      } else if (command.includes('EE')) {
        await addLog(
          'Status Check',
          'Requested device status', 
          true
        );
      }
    } catch (error) {
      console.error('Failed to send SMS:', error);
      Alert.alert(
        'Error',
        'Failed to open SMS. Please try again.',
        [{ text: 'OK' }]
      );
      await addLog('Initial Setup', `Error: ${error.message}`, false);
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
      <StandardHeader />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Card title="Configure Your GSM Opener" elevated>
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle-outline" size={24} color={colors.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>
              Enter the phone number of your GSM relay device. The default password is usually "1234".
            </Text>
          </View>
          
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
              <Ionicons name="alert-circle-outline" size={24} color={colors.warning} style={styles.infoIcon} />
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
              title="Register Admin Number"
              onPress={registerAdminNumber}
              loading={isLoading}
              disabled={!adminNumber || !unitNumber}
              icon={<Ionicons name="key-outline" size={20} color="white" />}
              style={styles.registerButton}
              fullWidth
            />
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.actionContainer}>
            <Button
              title="Test Connection"
              variant="secondary"
              onPress={testConnection}
              loading={isLoading}
              disabled={!unitNumber}
              icon={<Ionicons name="pulse-outline" size={20} color={colors.primary} />}
              style={styles.actionButton}
            />
            
            <Button
              title="Save Settings"
              onPress={saveToLocalStorage}
              loading={isLoading}
              disabled={!unitNumber}
              icon={<Ionicons name="save-outline" size={20} color="white" />}
              style={styles.actionButton}
            />
          </View>
        </Card>
        
        <Card title="How It Works" style={styles.helpCard}>
          <View style={styles.helpItem}>
            <Ionicons name="phone-portrait-outline" size={24} color={colors.primary} style={styles.helpIcon} />
            <Text style={styles.helpText}>
              The app communicates with your GSM relay device via SMS commands.
            </Text>
          </View>
          
          <View style={styles.helpItem}>
            <Ionicons name="shield-outline" size={24} color={colors.primary} style={styles.helpIcon} />
            <Text style={styles.helpText}>
              Register your number as an administrator to maintain full control over the device.
            </Text>
          </View>
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
});