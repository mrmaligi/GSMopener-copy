import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, Platform, Linking, TouchableOpacity, Clipboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './components/Card';
import { Button } from './components/Button';
import { TextInputField } from './components/TextInputField';
import { colors, spacing, borderRadius } from './styles/theme';
import { addLog } from '../utils/logging';
import { StandardHeader } from './components/StandardHeader';
import { useDevices } from './contexts/DeviceContext';
import { DeviceData } from '../types/devices';
import { getDevices, updateDevice } from '../utils/deviceStorage';
import { mapIoniconName } from './utils/iconMapping';
import { useAuthorizedUsers } from './hooks/useAuthorizedUsers';
import { useDataStore } from './contexts/DataStoreContext';

interface User {
  id: string;
  name: string;
  phoneNumber: string;
  serialNumber: string;
  startTime?: string;
  endTime?: string;
}

export default function Step3Page() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { activeDevice, refreshDevices } = useDevices();
  const [device, setDevice] = useState<DeviceData | null>(null);
  const [unitNumber, setUnitNumber] = useState('');
  const [password, setPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserSerial, setNewUserSerial] = useState('');
  const [newUserStartTime, setNewUserStartTime] = useState('');
  const [newUserEndTime, setNewUserEndTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [userCount, setUserCount] = useState(0);

  const { users, loadUsers } = useAuthorizedUsers(deviceId);

  const { 
    addUser, 
    authorizeUserForDevice, 
    deleteUser, 
    deauthorizeUserForDevice,
    addDeviceLog,
    logSMSOperation
  } = useDataStore();

  // Load data based on device context or params
  useEffect(() => {
    let currentDeviceId: string | undefined = undefined;
    
    if (params.deviceId) {
      currentDeviceId = String(params.deviceId);
      loadDeviceById(currentDeviceId);
    } else if (activeDevice) {
      currentDeviceId = activeDevice.id;
      setDevice(activeDevice);
      setUnitNumber(activeDevice.unitNumber);
      setPassword(activeDevice.password);
    } else {
      loadLegacySettings();
    }
    
    setDeviceId(currentDeviceId);
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

  // When deviceId changes, load users
  useEffect(() => {
    if (deviceId) {
      loadUsers().then(users => {
        setUserCount(users.length);
        generateNextSerial();
      });
    }
  }, [deviceId]);

  // Add a new effect to update user count when users array changes
  useEffect(() => {
    if (users) {
      setUserCount(users.length);
    }
  }, [users]);

  const sendSMS = async (command: string) => {
    if (!unitNumber) {
      Alert.alert('Error', 'GSM relay number not set. Please configure in Step 1 first.');
      await addLog('User Management', 'Failed: GSM relay number not set', false);
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
        await addLog('User Management', 'Failed: SMS not available on device', false);
        return;
      }

      await Linking.openURL(smsUrl);
      
      // Use the enhanced logSMSOperation function for consistent, clear logging
      if (deviceId) {
        await logSMSOperation(deviceId, command);
      } else {
        // Log using the old method as fallback
        await addLog('User Management', `Command sent: ${command.replace(password, '****')}`, true);
      }
    } catch (error) {
      console.error('Failed to send SMS:', error);
      Alert.alert(
        'Error',
        'Failed to open SMS. Please try again.',
        [{ text: 'OK' }]
      );
      await addLog('User Management', `Error: ${error.message}`, false);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate the next available serial number
  const generateNextSerial = () => {
    if (newUserSerial) return; // Skip if user already entered a serial
    
    const usedSerials = users
      .map(user => user.serialNumber ? parseInt(user.serialNumber, 10) : 0)
      .filter(num => !isNaN(num));
    
    let nextSerial = 1;
    while (usedSerials.includes(nextSerial) && nextSerial <= 200) {
      nextSerial++;
    }
    
    if (nextSerial <= 200) {
      setNewUserSerial(nextSerial.toString().padStart(3, '0'));
    }
  };

  const addNewUser = async () => {
    if (!deviceId) return;
    
    try {
      // Create the user in the DataStore
      const newUser = await addUser({
        name: newUserName || 'Unnamed User',
        phoneNumber: newUserPhone,
        serialNumber: newUserSerial,
        startTime: newUserStartTime || undefined,
        endTime: newUserEndTime || undefined
      });
      
      // Authorize for this device
      await authorizeUserForDevice(deviceId, newUser.id);
      
      // Refresh the list and update count
      const updatedUsers = await loadUsers();
      setUserCount(updatedUsers.length);
      
      // Create command based on provided data
      let command = `${password}A${newUser.serialNumber}#${newUserPhone}#`;
      
      // Add time restrictions if provided
      if (newUserStartTime && newUserEndTime) {
        command += `${newUserStartTime}#${newUserEndTime}#`;
      }
      
      // Send command to add user to device
      sendSMS(command);
      
      // Log the action
      await addDeviceLog(deviceId, 'User Management', `Added user: ${newUser.name}`, true);
      
      // Clear form
      setNewUserPhone('');
      setNewUserName('');
      setNewUserSerial('');
      setNewUserStartTime('');
      setNewUserEndTime('');
      
      // Update the completedSteps in AsyncStorage
      try {
        const savedCompletedSteps = await AsyncStorage.getItem('completedSteps');
        let completedSteps = savedCompletedSteps ? JSON.parse(savedCompletedSteps) : [];
        
        if (!completedSteps.includes('step3')) {
          completedSteps.push('step3');
          await AsyncStorage.setItem('completedSteps', JSON.stringify(completedSteps));
        }
      } catch (error) {
        console.error('Error updating completed steps:', error);
      }
      
      Alert.alert('Success', 'User added successfully');
      
      // Get next serial number for next user
      generateNextSerial();
    } catch (error) {
      console.error('Failed to add user:', error);
      Alert.alert('Error', 'Failed to add user');
    }
  };

  // Navigate to the authorized users list
  const navigateToUsersList = () => {
    if (deviceId) {
      router.push({
        pathname: '/authorized-users',
        params: { deviceId }
      });
    } else {
      Alert.alert('Error', 'Device ID is missing');
    }
  };

  // Simplified contact handling function
  const handleContacts = async () => {
    try {
      // Check if there's content in the clipboard
      let clipboardContent = '';
      try {
        clipboardContent = await Clipboard.getString();
      } catch (e) {
        console.log("Couldn't access clipboard");
      }
      
      // If there's a phone number in clipboard, suggest using it
      if (clipboardContent && /^[+\d\s\-()]{6,}$/.test(clipboardContent)) {
        Alert.alert(
          "Use Number from Clipboard?", 
          `Would you like to use this number?\n\n${clipboardContent}`,
          [
            { 
              text: "Yes", 
              onPress: () => {
                // Format the number by removing non-digit characters except + 
                const formattedNumber = clipboardContent.replace(/[^\d+]/g, '');
                setNewUserPhone(formattedNumber);
              }
            },
            { text: "No", style: "cancel" }
          ]
        );
        return;
      }

      // Otherwise guide the user
      Alert.alert(
        "Copy Phone Number",
        "To add a phone number:\n\n1. Copy the number from your contacts or messages\n2. Return to this app\n3. Press the paste button again",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error('Error with contacts:', error);
    }
  };

  return (
    <View style={styles.container}>
      <StandardHeader showBack backTo="/setup" />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Card title="User Management" elevated>
          <View style={styles.infoContainer}>
            <Ionicons name={mapIoniconName("information-circle-outline")} size={24} color={colors.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>
              Add phone numbers that are authorized to control your device. 
              Only these numbers will be able to send commands when "Authorized Only" mode is active.
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.managementButton}
            onPress={navigateToUsersList}
          >
            <View style={styles.buttonIconContainer}>
              <Ionicons name={mapIoniconName("people")} size={24} color={colors.primary} />
            </View>
            <View style={styles.buttonTextContainer}>
              <Text style={styles.buttonTitle}>Authorized Users</Text>
              <Text style={styles.buttonDescription}>
                View and manage all authorized users
              </Text>
            </View>
            <View style={styles.buttonBadge}>
              <Text style={styles.buttonBadgeText}>{userCount}</Text>
            </View>
            <Ionicons name={mapIoniconName("chevron-forward")} size={18} color={colors.text.secondary} />
          </TouchableOpacity>
          
          <View style={styles.divider} />
          
          <Text style={styles.sectionTitle}>Quick Add User</Text>
          
          <View style={styles.serialInputContainer}>
            <TextInputField
              label="Serial Position (001-200)"
              value={newUserSerial}
              onChangeText={setNewUserSerial}
              placeholder="Position number (e.g., 001)"
              keyboardType="number-pad"
              maxLength={3}
              info="Position to store in device memory"
              containerStyle={styles.serialInput}
            />
          </View>
          
          <View style={styles.phoneInputContainer}>
            <TextInputField
              label="Phone Number"
              value={newUserPhone}
              onChangeText={setNewUserPhone}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              required
              containerStyle={styles.phoneInput}
            />
            
            <TouchableOpacity style={styles.contactButton} onPress={handleContacts}>
              <Ionicons name={mapIoniconName("copy-outline")} size={22} color={colors.primary} />
              <Text style={styles.smallButtonText}>Paste</Text>
            </TouchableOpacity>
          </View>
          
          <TextInputField
            label="Name (Optional)"
            value={newUserName}
            onChangeText={setNewUserName}
            placeholder="Enter user name"
          />
          
          <TouchableOpacity 
            style={styles.advancedToggle}
            onPress={() => setShowAdvanced(!showAdvanced)}
          >
            <Text style={styles.advancedToggleText}>
              {showAdvanced ? 'Hide Time Restrictions' : 'Add Time Restrictions'}
            </Text>
            <Ionicons 
              name={mapIoniconName(showAdvanced ? "chevron-up-outline" : "chevron-down-outline")} 
              size={18} 
              color={colors.primary} 
            />
          </TouchableOpacity>
          
          {showAdvanced && (
            <View style={styles.advancedOptions}>
              <Text style={styles.advancedTitle}>Time Restrictions</Text>
              <Text style={styles.advancedDescription}>
                Optionally restrict when this user can access the device by setting start and end times.
              </Text>
              
              <View style={styles.timeRow}>
                <View style={styles.timeInput}>
                  <TextInputField
                    label="Start Time"
                    value={newUserStartTime}
                    onChangeText={setNewUserStartTime}
                    placeholder="YYMMDDHHMM"
                    keyboardType="number-pad"
                    maxLength={10}
                    info="Format: Year Month Day Hour Min"
                  />
                </View>
                
                <View style={styles.timeInput}>
                  <TextInputField
                    label="End Time"
                    value={newUserEndTime}
                    onChangeText={setNewUserEndTime}
                    placeholder="YYMMDDHHMM"
                    keyboardType="number-pad"
                    maxLength={10}
                    info="Format: Year Month Day Hour Min"
                  />
                </View>
              </View>
              
              <Text style={styles.exampleText}>
                Example: Start 2408050800 = Aug 5, 2024 8:00 AM
              </Text>
            </View>
          )}
          
          <Button
            title="Add User"
            onPress={addNewUser}
            loading={isLoading}
            disabled={!newUserPhone || !newUserSerial}
            icon={<Ionicons name={mapIoniconName("person-add-outline")} size={20} color="white" />}
            style={styles.addButton}
            fullWidth
          />
        </Card>
        
        <Button
          title="Continue to Device Settings"
          variant="secondary"
          onPress={() => router.push({
            pathname: '/step4',
            params: deviceId ? { deviceId } : {}
          })}
          style={styles.nextButton}
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
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  nextButton: {
    marginTop: spacing.lg,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  phoneInput: {
    flex: 1,
    marginBottom: 0,
  },
  serialInputContainer: {
    marginBottom: spacing.sm,
  },
  serialInput: {
    marginBottom: spacing.sm,
  },
  contactButton: {
    backgroundColor: `${colors.primary}15`,
    padding: 8,
    borderRadius: borderRadius.md,
    marginLeft: 8,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  smallButtonText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  addButton: {
    marginTop: spacing.sm,
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    padding: 8,
    backgroundColor: `${colors.primary}10`,
    borderRadius: 8,
  },
  advancedToggleText: {
    color: colors.primary,
    fontWeight: '500',
    marginRight: 4,
  },
  advancedOptions: {
    marginTop: 8,
    marginBottom: 16,
    padding: 12,
    backgroundColor: `${colors.surfaceVariant}50`,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  advancedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  advancedDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 12,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeInput: {
    width: '48%',
  },
  exampleText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontStyle: 'italic',
    marginTop: 4,
    textAlign: 'center',
  },
  managementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: `${colors.surfaceVariant}50`,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  buttonDescription: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  buttonBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: spacing.sm,
  },
  buttonBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});