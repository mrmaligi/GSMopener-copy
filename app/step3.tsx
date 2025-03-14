import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, Platform, Linking, TouchableOpacity, TextInput, Clipboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from './components/Header';
import { Card } from './components/Card';
import { Button } from './components/Button';
import { TextInputField } from './components/TextInputField';
import { colors, spacing, shadows, borderRadius } from './styles/theme';

interface User {
  phoneNumber: string;
  name: string;
  id?: string;
  serialNumber?: string;
  startTime?: string;
  endTime?: string;
}

export default function Step3Page() {
  const router = useRouter();
  const [unitNumber, setUnitNumber] = useState('');
  const [password, setPassword] = useState('');
  const [newUserSerial, setNewUserSerial] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserStartTime, setNewUserStartTime] = useState('');
  const [newUserEndTime, setNewUserEndTime] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    loadData();
    generateNextSerial();
  }, [users]);

  const loadData = async () => {
    try {
      const savedUnitNumber = await AsyncStorage.getItem('unitNumber');
      const savedPassword = await AsyncStorage.getItem('password');
      const savedUsers = await AsyncStorage.getItem('authorizedUsers');

      if (savedUnitNumber) setUnitNumber(savedUnitNumber);
      if (savedPassword) setPassword(savedPassword);
      if (savedUsers) setUsers(JSON.parse(savedUsers));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const saveUsers = async (updatedUsers: User[]) => {
    try {
      await AsyncStorage.setItem('authorizedUsers', JSON.stringify(updatedUsers));
      
      // Mark step as completed
      const savedCompletedSteps = await AsyncStorage.getItem('completedSteps');
      let completedSteps = savedCompletedSteps ? JSON.parse(savedCompletedSteps) : [];
      
      if (!completedSteps.includes('step3')) {
        completedSteps.push('step3');
        await AsyncStorage.setItem('completedSteps', JSON.stringify(completedSteps));
      }
    } catch (error) {
      console.error('Error saving data:', error);
      Alert.alert('Error', 'Failed to save users');
    }
  };

  const sendSMS = async (command: string) => {
    if (!unitNumber) {
      Alert.alert('Error', 'GSM relay number not set. Please configure in Step 1 first.');
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
        return;
      }

      await Linking.openURL(smsUrl);
    } catch (error) {
      console.error('Failed to send SMS:', error);
      Alert.alert(
        'Error',
        'Failed to open SMS. Please try again.',
        [{ text: 'OK' }]
      );
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

  const addUser = () => {
    if (!newUserPhone) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }
    
    if (!newUserSerial) {
      Alert.alert('Error', 'Please enter a serial number (001-200)');
      return;
    }
    
    // Check if phone already exists
    if (users.some(user => user.phoneNumber === newUserPhone)) {
      Alert.alert('Error', 'This phone number is already authorized');
      return;
    }
    
    // Validate serial number
    let serialNumber = newUserSerial;
    
    // Check if serial is between 1-200
    const serialNum = parseInt(serialNumber, 10);
    if (isNaN(serialNum) || serialNum < 1 || serialNum > 200) {
      Alert.alert('Error', 'Serial number must be between 1 and 200');
      return;
    }
    
    // Pad with leading zeros to make it 3 digits
    serialNumber = serialNum.toString().padStart(3, '0');
    
    // Check if serial is already used
    if (users.some(user => user.serialNumber === serialNumber)) {
      Alert.alert('Error', 'This serial position is already in use');
      return;
    }
    
    // Validate times if provided
    if ((newUserStartTime && !newUserEndTime) || (!newUserStartTime && newUserEndTime)) {
      Alert.alert('Error', 'Both start and end times must be provided');
      return;
    }
    
    if (newUserStartTime && newUserEndTime) {
      // Check format: YYMMDDHHMM (10 digits)
      const timeRegex = /^\d{10}$/;
      if (!timeRegex.test(newUserStartTime) || !timeRegex.test(newUserEndTime)) {
        Alert.alert('Error', 'Time format must be YYMMDDHHMM (10 digits)');
        return;
      }
    }
    
    // Add user locally
    const newUser = {
      phoneNumber: newUserPhone.replace(/[^\d+]/g, ''), // Clean the phone number
      name: newUserName || 'User ' + serialNumber,
      id: (users.length + 1).toString().padStart(3, '0'),
      serialNumber: serialNumber,
      startTime: newUserStartTime || undefined,
      endTime: newUserEndTime || undefined
    };
    
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
    
    // Create command based on provided data
    let command = `${password}A${serialNumber}#${newUser.phoneNumber}#`;
    
    // Add time restrictions if provided
    if (newUserStartTime && newUserEndTime) {
      command += `${newUserStartTime}#${newUserEndTime}#`;
    }
    
    // Send command to add user to device
    sendSMS(command);
    
    // Clear form
    setNewUserPhone('');
    setNewUserName('');
    setNewUserSerial('');
    setNewUserStartTime('');
    setNewUserEndTime('');
    
    Alert.alert('Success', 'User added successfully');
  };

  const removeUser = (user: User) => {
    const serialNumber = user.serialNumber || '001';
    const phoneNumber = user.phoneNumber;
    
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to remove this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            // Remove user locally
            const updatedUsers = users.filter(u => u.phoneNumber !== phoneNumber);
            setUsers(updatedUsers);
            saveUsers(updatedUsers);
            
            // Send command to remove user from device using A command with empty phone
            sendSMS(`${password}A${serialNumber}##`);
          }
        }
      ]
    );
  };

  // Simplified contact handling function
  const handleContacts = async () => {
    try {
      // For both platforms, we'll use a simpler approach
      // First, check if there's content in the clipboard
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
        "Add Contact Number",
        "To add a contact:\n\n1. Copy the phone number from your contacts app\n2. Return to this app\n3. Press the contacts button again to paste",
        [{ text: "OK" }]
      );
      
    } catch (error) {
      console.error('Error with contacts:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="User Management" showBack backTo="/setup" />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Card title="Add Authorized User" elevated>
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle-outline" size={24} color={colors.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>
              Add phone numbers that are authorized to control the GSM relay.
              Serial numbers range from 001 to 200.
            </Text>
          </View>
          
          <TextInputField
            label="Serial Number (001-200)"
            value={newUserSerial}
            onChangeText={setNewUserSerial}
            placeholder="Position number (001-200)"
            keyboardType="number-pad"
            maxLength={3}
            info="Position to store the authorized user in device memory"
            required
          />
          
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
              <Ionicons name="clipboard-outline" size={22} color={colors.primary} />
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
              name={showAdvanced ? "chevron-up-outline" : "chevron-down-outline"} 
              size={18} 
              color={colors.primary} 
            />
          </TouchableOpacity>
          
          {showAdvanced && (
            <View style={styles.advancedOptions}>
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
            onPress={addUser}
            loading={isLoading}
            disabled={!newUserPhone || !newUserSerial}
            icon={<Ionicons name="person-add-outline" size={20} color="white" />}
            fullWidth
          />
        </Card>
        
        <Card title="Authorized Users">
          {users.length === 0 ? (
            <Text style={styles.emptyText}>No authorized users yet.</Text>
          ) : (
            users.map((user, index) => (
              <View key={user.phoneNumber || index} style={[
                styles.userItem,
                index < users.length - 1 && styles.userItemBorder
              ]}>
                <View style={styles.userInfo}>
                  <View style={styles.userHeader}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userSerial}>#{user.serialNumber || (index + 1).toString().padStart(3, '0')}</Text>
                  </View>
                  <Text style={styles.userPhone}>{user.phoneNumber}</Text>
                  
                  {user.startTime && user.endTime && (
                    <Text style={styles.userAccess}>
                      Access: {user.startTime} to {user.endTime}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => removeUser(user)}
                >
                  <Ionicons name="trash-outline" size={22} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))
          )}
          
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => router.push('/authorized-users-list')}
          >
            <Text style={styles.viewAllButtonText}>View All Users</Text>
            <Ionicons name="chevron-forward-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        </Card>
        
        <Button
          title="Continue to Next Step"
          variant="secondary"
          onPress={() => router.push('/step4')}
          style={styles.nextButton}
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
  emptyText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    padding: spacing.md,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  userItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
  },
  userSerial: {
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  userPhone: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  userAccess: {
    fontSize: 14,
    color: colors.text.secondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  deleteButton: {
    padding: spacing.sm,
  },
  nextButton: {
    marginTop: spacing.lg,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 8,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
  },
  viewAllButtonText: {
    color: colors.primary,
    fontWeight: '600',
    marginRight: 4,
    fontSize: 16,
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
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  phoneInput: {
    flex: 1,
    marginBottom: 0,
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
});