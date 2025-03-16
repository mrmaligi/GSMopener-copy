import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Linking, Platform, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addLog } from '../utils/logging';
import { StandardHeader } from './components/StandardHeader';
import { useDevices } from './contexts/DeviceContext';
import { DeviceData } from '../types/devices';
import { getDevices } from '../utils/deviceStorage';

interface AuthorizedUser {
  serial: string;
  phone: string;
  startTime: string;
  endTime: string;
}

export default function AuthorizedUsersPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { activeDevice } = useDevices();
  const [device, setDevice] = useState<DeviceData | null>(null);
  const [unitNumber, setUnitNumber] = useState('');
  const [password, setPassword] = useState('1234');
  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>([
    { serial: '001', phone: '', startTime: '', endTime: '' },
    { serial: '002', phone: '', startTime: '', endTime: '' },
    { serial: '003', phone: '', startTime: '', endTime: '' },
    { serial: '004', phone: '', startTime: '', endTime: '' },
    { serial: '005', phone: '', startTime: '', endTime: '' },
  ]);

  // Load data based on device context or params
  useEffect(() => {
    if (params.deviceId) {
      loadDeviceById(String(params.deviceId));
    } else if (activeDevice) {
      setDevice(activeDevice);
      setUnitNumber(activeDevice.unitNumber);
      setPassword(activeDevice.password);
    } else {
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
        loadAuthorizedUsers(foundDevice.id);
      }
    } catch (error) {
      console.error('Failed to load device:', error);
    }
  };

  const loadLegacyData = async () => {
    try {
      const savedUnitNumber = await AsyncStorage.getItem('unitNumber');
      const savedPassword = await AsyncStorage.getItem('password');

      if (savedUnitNumber) setUnitNumber(savedUnitNumber);
      if (savedPassword) setPassword(savedPassword);
      
      // Load legacy authorized users
      loadAuthorizedUsers();
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadAuthorizedUsers = async (deviceId?: string) => {
    try {
      // Check for device-specific users first
      let savedUsers = null;
      if (deviceId) {
        savedUsers = await AsyncStorage.getItem(`authorizedUsers_${deviceId}`);
      }
      
      // Fall back to legacy storage if no device-specific users
      if (!savedUsers) {
        savedUsers = await AsyncStorage.getItem('authorizedUsers');
      }

      if (savedUsers) setAuthorizedUsers(JSON.parse(savedUsers));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const saveToLocalStorage = async () => {
    try {
      // Save to device-specific key if available
      if (device?.id) {
        await AsyncStorage.setItem(`authorizedUsers_${device.id}`, JSON.stringify(authorizedUsers));
      } else {
        // Otherwise use legacy storage
        await AsyncStorage.setItem('authorizedUsers', JSON.stringify(authorizedUsers));
      }
      
      Alert.alert('Success', 'User settings saved successfully!');
    } catch (error) {
      console.error('Error saving data:', error);
      Alert.alert('Error', 'Failed to save user settings');
    }
  };

  // SMS Commands
  const sendSMS = async (command) => {
    const smsUrl = Platform.select({
      ios: `sms:${unitNumber.replace('+', '')}&body=${encodeURIComponent(command)}`,
      android: `sms:${unitNumber}?body=${encodeURIComponent(command)}`,
      default: `sms:${unitNumber}?body=${encodeURIComponent(command)}`,
    });
    
    Linking.canOpenURL(smsUrl)
      .then(supported => {
        if (!supported) {
          alert('SMS is not available on this device');
          addLog('Authorized Users', 'Error: SMS is not available on this device', false);
          return;
        }
        
        return Linking.openURL(smsUrl);
      })
      .then(() => {
        // Log successful SMS opening with masked password
        const maskedCommand = command.replace(password, '****');
        addLog(
          'Authorized Users', 
          `Command sent: ${maskedCommand}`, 
          true
        );
      })
      .catch(err => {
        console.error('Error opening SMS:', err);
        addLog('Authorized Users', `Error: ${err.message}`, false);
        alert('An error occurred when trying to open SMS app');
      });
  };

  // Manage Authorized Users
  const addAuthorizedUser = (index) => {
    const user = authorizedUsers[index];
    if (!user.phone) {
      alert('Please enter a phone number');
      return;
    }

    let command = `${password}A${user.serial}#${user.phone}#`;

    // Add time restrictions if provided
    if (user.startTime && user.endTime) {
      command += `${user.startTime}#${user.endTime}#`;
    }

    sendSMS(command);
  };

  const deleteAuthorizedUser = (index) => {
    const user = authorizedUsers[index];
    sendSMS(`${password}A${user.serial}##`);

    // Clear the user data in state
    const newUsers = [...authorizedUsers];
    newUsers[index] = { ...newUsers[index], phone: '', startTime: '', endTime: '' };
    setAuthorizedUsers(newUsers);
  };

  return (
    <View style={styles.container}>
      <StandardHeader showBack backTo="/step3" />
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Manage Authorized Users</Text>
          <Text style={styles.subtitle}>Add or remove users who can call the device to control the relay.</Text>
          <Text style={styles.subtitle}>Serial numbers range from 001 to 200.</Text>
        </View>

        {authorizedUsers.map((user, index) => (
          <View key={index} style={styles.userCard}>
            <Text style={styles.userTitle}>User {parseInt(user.serial)}</Text>
            
            <Text style={styles.inputLabel}>Serial Number</Text>
            <TextInput
              style={styles.input}
              value={user.serial}
              onChangeText={(text) => {
                const newUsers = [...authorizedUsers];
                newUsers[index].serial = text.padStart(3, '0');
                setAuthorizedUsers(newUsers);
              }}
              keyboardType="number-pad"
              maxLength={3}
            />
            
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={user.phone}
              onChangeText={(text) => {
                const newUsers = [...authorizedUsers];
                newUsers[index].phone = text;
                setAuthorizedUsers(newUsers);
              }}
              keyboardType="phone-pad"
            />
            
            <View style={styles.timeInputRow}>
              <View style={styles.timeInputContainer}>
                <Text style={styles.inputLabel}>Start Time (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={user.startTime}
                  onChangeText={(text) => {
                    const newUsers = [...authorizedUsers];
                    newUsers[index].startTime = text;
                    setAuthorizedUsers(newUsers);
                  }}
                  placeholder="YYMMDDHHMM"
                  keyboardType="number-pad"
                />
              </View>
              
              <View style={styles.timeInputContainer}>
                <Text style={styles.inputLabel}>End Time (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={user.endTime}
                  onChangeText={(text) => {
                    const newUsers = [...authorizedUsers];
                    newUsers[index].endTime = text;
                    setAuthorizedUsers(newUsers);
                  }}
                  placeholder="YYMMDDHHMM"
                  keyboardType="number-pad"
                />
              </View>
            </View>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => addAuthorizedUser(index)}
              >
                <Text style={styles.buttonText}>Add User</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => deleteAuthorizedUser(index)}
              >
                <Text style={styles.buttonText}>Delete User</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.commandPreview}>
              Add: {password}A{user.serial}#{user.phone || "xxxxxxxxxx"}#
              {user.startTime ? `${user.startTime}#${user.endTime}#` : ""}
            </Text>
            <Text style={styles.commandPreview}>
              Delete: {password}A{user.serial}##
            </Text>
          </View>
        ))}

        <TouchableOpacity 
          style={styles.saveButton}
          onPress={saveToLocalStorage}
        >
          <Text style={styles.saveButtonText}>Save User Settings</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  content: {
    padding: 16,
    paddingBottom: 80,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  userCard: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  userTitle: {
    fontSize: 20,
    color: '#00bfff',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 18,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  timeInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeInputContainer: {
    width: '48%',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#00bfff',
    borderRadius: 8,
    padding: 12,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#ff4500',
    borderRadius: 8,
    padding: 12,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  commandPreview: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
  },
});