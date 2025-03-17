import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
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
import { useDataStore } from './contexts/DataStoreContext';

export default function Step4Page() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { activeDevice, refreshDevices } = useDevices();
  const [device, setDevice] = useState<DeviceData | null>(null);
  const [unitNumber, setUnitNumber] = useState('');
  const [password, setPassword] = useState('');
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [relaySettings, setRelaySettings] = useState({
    accessControl: 'AUT',  // AUT (only authorized) or ALL (anyone can control)
    latchTime: '000',      // Relay latch time in seconds (000-999)
  });
  const [isLoading, setIsLoading] = useState(false);
  // Fix missing imports by adding logSMSOperation
  const { addDeviceLog, logSMSOperation } = useDataStore();

  // Load appropriate device data
  useEffect(() => {
    if (params.deviceId) {
      // Load specific device if ID provided
      const id = String(params.deviceId);
      setDeviceId(id);
      loadDeviceById(id);
    } else if (activeDevice) {
      // Otherwise use active device
      setDeviceId(activeDevice.id);
      setDevice(activeDevice);
      setUnitNumber(activeDevice.unitNumber);
      setPassword(activeDevice.password);
      if (activeDevice.relaySettings) {
        setRelaySettings(activeDevice.relaySettings);
      }
    } else {
      // Fall back to legacy storage
      loadLegacyData();
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
        if (foundDevice.relaySettings) {
          setRelaySettings(foundDevice.relaySettings);
        }
      }
    } catch (error) {
      console.error('Error loading device:', error);
    }
  };

  const loadLegacyData = async () => {
    try {
      const savedUnitNumber = await AsyncStorage.getItem('unitNumber');
      const savedPassword = await AsyncStorage.getItem('password');
      const savedRelaySettings = await AsyncStorage.getItem('relaySettings');

      if (savedUnitNumber) setUnitNumber(savedUnitNumber);
      if (savedPassword) setPassword(savedPassword);
      if (savedRelaySettings) setRelaySettings(JSON.parse(savedRelaySettings));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const saveToLocalStorage = async () => {
    try {
      if (device) {
        // Update device with new relay settings
        const updatedDevice = {
          ...device,
          relaySettings
        };
        await updateDevice(updatedDevice);
        await refreshDevices();
      } else {
        // Legacy storage
        await AsyncStorage.setItem('relaySettings', JSON.stringify(relaySettings));
      }
      
      // Mark step as completed
      const savedCompletedSteps = await AsyncStorage.getItem('completedSteps');
      let completedSteps = savedCompletedSteps ? JSON.parse(savedCompletedSteps) : [];
      
      if (!completedSteps.includes('step4')) {
        completedSteps.push('step4');
        await AsyncStorage.setItem('completedSteps', JSON.stringify(completedSteps));
      }
      
      Alert.alert('Success', 'Relay settings saved');
    } catch (error) {
      console.error('Error saving data:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const sendSMS = async (command: string) => {
    if (!deviceId || !unitNumber) {
      Alert.alert('Error', 'Device information missing');
      return;
    }

    setIsLoading(true);

    try {
      const formattedUnitNumber = Platform.OS === 'ios' ? 
        unitNumber.replace('+', '') : unitNumber;

      const smsUrl = Platform.select({
        ios: `sms:${formattedUnitNumber}&body=${encodeURIComponent(command)}`,
        android: `sms:${formattedUnitNumber}?body=${encodeURIComponent(command)}`,
        default: `sms:${formattedUnitNumber}?body=${encodeURIComponent(command)}`
      });

      const supported = await Linking.canOpenURL(smsUrl);
      if (!supported) {
        throw new Error('SMS is not available on this device');
      }

      await Linking.openURL(smsUrl);
      
      // Log the SMS operation with appropriate categorization
      await logSMSOperation(deviceId, command, true);
      
    } catch (error) {
      console.error('Failed to send SMS:', error);
      await addDeviceLog(
        deviceId,
        'SMS Error',
        `Failed to send command: ${error.message}`,
        false,
        'relay'
      );
      Alert.alert('Error', `Failed to send SMS: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Relay Access Control Settings
  const setAccessControl = (type: 'AUT' | 'ALL') => {
    // Update local state
    setRelaySettings(prev => ({ ...prev, accessControl: type }));
    
    // Send command to device
    const command = type === 'ALL' ? `${password}ALL#` : `${password}AUT#`;
    sendSMS(command);
    
    // Save to local storage
    saveToLocalStorage();
  };

  // Latch Time Settings
  const setLatchTime = () => {
    // Ensure latch time is a 3-digit number
    const latchTime = relaySettings.latchTime.padStart(3, '0');
    
    // Send command to device
    sendSMS(`${password}GOT${latchTime}#`);
    
    // Save to local storage
    saveToLocalStorage();
  };

  // Handle latch time input
  const handleLatchTimeChange = (text: string) => {
    // Filter non-digits and limit to 3 digits
    const filtered = text.replace(/[^0-9]/g, '').slice(0, 3);
    setRelaySettings(prev => ({ ...prev, latchTime: filtered }));
  };

  return (
    <View style={styles.container}>
      <StandardHeader showBack backTo="/setup" />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.infoContainer}>
          <Ionicons name={mapIoniconName("information-circle-outline")} size={24} color={colors.primary} style={styles.infoIcon} />
          <Text style={styles.infoText}>
            Configure how your GSM relay operates. These settings control access permissions and relay behavior.
          </Text>
        </View>
        
        <Card title="Access Control" elevated>
          <Text style={styles.sectionDescription}>
            Choose who can control your GSM relay device
          </Text>
          
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[
                styles.optionButton,
                relaySettings.accessControl === 'AUT' && styles.optionButtonSelected
              ]}
              onPress={() => setAccessControl('AUT')}
            >
              <Ionicons 
                name="people" 
                size={24} 
                color={relaySettings.accessControl === 'AUT' ? colors.primary : colors.text.secondary} 
              />
              <Text style={[
                styles.optionText,
                relaySettings.accessControl === 'AUT' && styles.optionTextSelected
              ]}>
                Authorized Only
              </Text>
              <Text style={styles.optionDescription}>
                Only authorized phone numbers can control the relay
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.optionButton,
                relaySettings.accessControl === 'ALL' && styles.optionButtonSelected
              ]}
              onPress={() => setAccessControl('ALL')}
            >
              <Ionicons 
                name="globe" 
                size={24} 
                color={relaySettings.accessControl === 'ALL' ? colors.primary : colors.text.secondary} 
              />
              <Text style={[
                styles.optionText,
                relaySettings.accessControl === 'ALL' && styles.optionTextSelected
              ]}>
                Allow All
              </Text>
              <Text style={styles.optionDescription}>
                Any phone number can control the relay with correct password
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
        
        <Card title="Relay Timing Settings">
          <Text style={styles.sectionDescription}>
            Configure how long the relay stays active
          </Text>
          
          <View style={styles.latchTimeContainer}>
            <Text style={styles.latchTimeLabel}>Latch Time (in seconds)</Text>
            <Text style={styles.latchTimeHelp}>
              Set to 000 for toggle mode (stays on until turned off)
            </Text>
            
            <View style={styles.latchInputRow}>
              <TextInputField
                value={relaySettings.latchTime}
                onChangeText={handleLatchTimeChange}
                placeholder="Enter time in seconds (000-999)"
                keyboardType="number-pad"
                maxLength={3}
                containerStyle={styles.latchTimeInput}
              />
              
              <Button
                title="Set Timing"
                onPress={setLatchTime}
                loading={isLoading}
                disabled={!relaySettings.latchTime}
              />
            </View>
          </View>
        </Card>
        
        <Button
          title="Complete Setup"
          variant="secondary"
          onPress={() => router.push({
            pathname: '/(tabs)',  // Changed from '/setup' to '/(tabs)' to navigate to the main tabs (home)
            params: deviceId ? { deviceId } : {}
          })}
          style={styles.completeButton}
          icon={<Ionicons name={mapIoniconName("checkmark-circle")} size={20} color={colors.primary} />}
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
  sectionDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  optionsContainer: {
    flexDirection: 'column',
    gap: spacing.md,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  optionButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing.xs,
    marginBottom: spacing.xs / 2,
  },
  optionTextSelected: {
    color: colors.primary,
  },
  optionDescription: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  latchTimeContainer: {
    marginVertical: spacing.xs,
  },
  latchTimeLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  latchTimeHelp: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  latchInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  latchTimeInput: {
    flex: 1,
    marginRight: spacing.sm,
    marginBottom: 0,
  },
  completeButton: {
    marginTop: spacing.lg,
  },
});
