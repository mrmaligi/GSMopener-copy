import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity, Alert, Platform, Linking, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from './styles/theme';
import { StandardHeader } from './components/StandardHeader';
import { Card } from './components/Card';
import { TextInputField } from './components/TextInputField';
import { Button } from './components/Button';
import { useDevices } from './contexts/DeviceContext';
import { useDataStore } from './contexts/DataStoreContext';
import { openSMSApp } from '../utils/smsUtils'; // Fixed import path from 'sms' to 'smsUtils'
import { DeviceData } from '../types/devices';
import { getDevices } from '../utils/deviceStorage';
import { mapIoniconName } from './utils/iconMapping';
import { PageWithHeader } from './components/PageWithHeader';

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
  const [isDataLoading, setIsDataLoading] = useState(true);
  const { addDeviceLog, logSMSOperation, getDeviceById, updateDevice } = useDataStore();

  // Load appropriate device data
  const loadData = useCallback(async () => {
    console.log("Step4: Starting to load data");
    setIsDataLoading(true);
    
    try {
      if (params.deviceId) {
        // Load specific device if ID provided
        const id = String(params.deviceId);
        setDeviceId(id);
        console.log("Step4: Loading device by ID:", id);
        
        // Use DataStore to get device info directly
        const foundDevice = getDeviceById(id);
        
        if (foundDevice) {
          console.log("Step4: Found device:", foundDevice.name);
          setDevice(foundDevice);
          
          if (foundDevice.unitNumber) {
            console.log("Step4: Setting unitNumber from loadDeviceById:", foundDevice.unitNumber);
            setUnitNumber(foundDevice.unitNumber);
          } else {
            console.warn("Step4: Found device missing phone number, trying legacy data");
            await loadLegacyData();
          }
          
          setPassword(foundDevice.password || '1234');
          if (foundDevice.relaySettings) {
            setRelaySettings(foundDevice.relaySettings);
          }
        } else {
          console.warn("Step4: Device not found with ID:", id);
          await loadLegacyData();
        }
      } else if (activeDevice) {
        // Otherwise use active device
        setDeviceId(activeDevice.id);
        setDevice(activeDevice);
        
        if (activeDevice.unitNumber) {
          console.log("Step4: Setting unitNumber from active device:", activeDevice.unitNumber);
          setUnitNumber(activeDevice.unitNumber);
        } else {
          console.warn("Step4: Active device missing phone number!");
          await loadLegacyData();
        }
        
        setPassword(activeDevice.password || '1234');
        if (activeDevice.relaySettings) {
          setRelaySettings(activeDevice.relaySettings);
        }
      } else {
        // Fall back to legacy storage
        console.log("Step4: No device found, loading legacy settings");
        await loadLegacyData();
      }
    } catch (error) {
      console.error("Step4: Error in loadData:", error);
      await loadLegacyData(); // Always try legacy data on error
    } finally {
      setIsDataLoading(false);
    }
  }, [params.deviceId, activeDevice, getDeviceById]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Separate legacy data loading function
  const loadLegacyData = async () => {
    console.log("Step4: Loading legacy data");
    try {
      const savedUnitNumber = await AsyncStorage.getItem('unitNumber');
      const savedPassword = await AsyncStorage.getItem('password');
      const savedRelaySettings = await AsyncStorage.getItem('relaySettings');

      if (savedUnitNumber) {
        console.log("Step4: Found legacy unitNumber:", savedUnitNumber);
        setUnitNumber(savedUnitNumber);
      } else {
        console.warn("Step4: No unitNumber found in legacy storage");
      }
      
      if (savedPassword) setPassword(savedPassword || '1234');
      if (savedRelaySettings) setRelaySettings(JSON.parse(savedRelaySettings));
    } catch (error) {
      console.error('Step4: Error loading legacy data:', error);
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

  // Fix sendSMS function to use the updated SMS utility with better validation
  const sendSMS = async (command: string) => {
    // Try to ensure unitNumber is available
    if (!unitNumber) {
      // One last attempt to load from storage directly
      try {
        const savedUnitNumber = await AsyncStorage.getItem('unitNumber');
        if (savedUnitNumber) {
          console.log("Step4: Found unitNumber in last-chance check:", savedUnitNumber);
          setUnitNumber(savedUnitNumber);
          
          // Now we can proceed with the SMS
          const result = await openSMSApp(savedUnitNumber, command);
          if (result && deviceId) {
            await logSMSOperation(deviceId, command, true);
          }
          return;
        }
      } catch (error) {
        console.error("Step4: Last-chance unitNumber check failed:", error);
      }
      
      // If we still don't have it, show the error
      console.error("Step4: Attempted to send SMS but unitNumber is missing");
      Alert.alert(
        'Phone Number Missing',
        'Cannot find the device phone number. Please check your device configuration.',
        [
          { text: 'OK', style: 'cancel' }
        ]
      );
      return;
    }

    if (!deviceId) {
      Alert.alert('Error', 'Device ID is missing');
      return;
    }

    if (!unitNumber) {
      console.error("Step4: Attempted to send SMS but unitNumber is missing");
      Alert.alert(
        'Phone Number Missing',
        'Device phone number is missing. Please go back to Step 1 and ensure the device phone number is configured properly.',
        [
          { text: 'Go to Step 1', onPress: () => router.push('/step1') },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    setIsLoading(true);

    try {
      console.log(`Step4: Sending SMS command: ${command} to ${unitNumber}`);
      const result = await openSMSApp(unitNumber, command);
      
      if (!result) {
        throw new Error('Failed to open SMS app');
      }
      
      await logSMSOperation(deviceId, command, true);
      
    } catch (error) {
      console.error('Step4: Failed to send SMS:', error);
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

  // Relay Access Control Settings with disabled state when unitNumber is missing
  const setAccessControl = (type: 'AUT' | 'ALL') => {
    try {
      if (!unitNumber) {
        Alert.alert('Error', 'Device phone number is missing. Please configure it in Step 1 first.');
        return;
      }

      // Update local state
      setRelaySettings(prev => ({ ...prev, accessControl: type }));
      
      // Send command to device
      const command = type === 'ALL' ? `${password}ALL#` : `${password}AUT#`;
      sendSMS(command);
      
      // Save to local storage
      saveToLocalStorage();
    } catch (error) {
      console.error('Error setting access control:', error);
      Alert.alert('Error', 'Failed to update access control setting');
    }
  };

  // Latch Time Settings with disabled state when unitNumber is missing
  const setLatchTime = () => {
    try {
      if (!unitNumber) {
        Alert.alert('Error', 'Device phone number is missing. Please configure it in Step 1 first.');
        return;
      }

      // Ensure latch time is a 3-digit number
      const latchTime = relaySettings.latchTime.padStart(3, '0');
      
      // Send command to device
      sendSMS(`${password}GOT${latchTime}#`);
      
      // Save to local storage
      saveToLocalStorage();
    } catch (error) {
      console.error('Error setting latch time:', error);
      Alert.alert('Error', 'Failed to update latch time setting');
    }
  };

  // Handle latch time input
  const handleLatchTimeChange = (text: string) => {
    // Filter non-digits and limit to 3 digits
    const filtered = text.replace(/[^0-9]/g, '').slice(0, 3);
    setRelaySettings(prev => ({ ...prev, latchTime: filtered }));
  };

  // Debugging log for unitNumber changes
  useEffect(() => {
    console.log("Step4: Current unitNumber state:", unitNumber);
  }, [unitNumber]);

  if (isDataLoading) {
    return (
      <PageWithHeader title="Relay Settings" showBack backTo="/setup">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading device settings...</Text>
        </View>
      </PageWithHeader>
    );
  }

  return (
    <PageWithHeader title="Relay Settings" showBack backTo="/setup">
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Debugging info - remove in production */}
        <Card title="Device Info" elevated>
          <Text>Device Number: {unitNumber || 'Missing'}</Text>
          <Text>Device ID: {deviceId || 'Missing'}</Text>
          <Text>Password: {password ? '****' : 'Missing'}</Text>
        </Card>

        <View style={styles.infoContainer}>
          <Ionicons name={mapIoniconName("information-circle-outline")} size={24} color={colors.primary} style={styles.infoIcon} />
          <Text style={styles.infoText}>
            Configure how your GSM relay operates. These settings control access permissions and relay behavior.
          </Text>
        </View>
        
        {/* Display warning if unitNumber is missing */}
        {!unitNumber && (
          <View style={styles.warningContainer}>
            <Ionicons name={mapIoniconName("warning-outline")} size={24} color={colors.warning} style={styles.infoIcon} />
            <Text style={styles.warningText}>
              Device phone number is missing. Please configure it in Step 1 before changing device settings.
            </Text>
            <Button
              title="Go to Step 1"
              variant="secondary"
              onPress={() => router.push('/step1')}
              style={styles.warningButton}
              icon={<Ionicons name={mapIoniconName("arrow-back")} size={16} color={colors.primary} />}
              fullWidth
            />
          </View>
        )}
        
        <Card title="Access Control" elevated>
          <Text style={styles.sectionDescription}>
            Choose who can control your GSM relay device
          </Text>
          
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[
                styles.optionButton,
                relaySettings.accessControl === 'AUT' && styles.optionButtonSelected,
                !unitNumber && styles.optionButtonDisabled // Add disabled style
              ]}
              onPress={() => setAccessControl('AUT')}
              disabled={!unitNumber} // Disable when unitNumber is missing
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
                relaySettings.accessControl === 'ALL' && styles.optionButtonSelected,
                !unitNumber && styles.optionButtonDisabled // Add disabled style
              ]}
              onPress={() => setAccessControl('ALL')}
              disabled={!unitNumber} // Disable when unitNumber is missing
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
                editable={!!unitNumber} // Make editable only when unitNumber exists
              />
              
              <Button
                title="Set Timing"
                onPress={setLatchTime}
                loading={isLoading}
                disabled={!relaySettings.latchTime || !unitNumber} // Disable when unitNumber is missing
                style={!unitNumber ? styles.buttonDisabled : undefined} // Add disabled style
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
    </PageWithHeader>
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
  // Add new styles for warning and disabled elements
  warningContainer: {
    backgroundColor: `${colors.warning}15`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  warningText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  warningButton: {
    marginTop: spacing.xs,
  },
  optionButtonDisabled: {
    opacity: 0.5,
    backgroundColor: `${colors.surfaceVariant}50`,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.text.secondary,
    fontSize: 16,
  },
});
