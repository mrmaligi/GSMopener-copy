import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, Platform, Linking, TouchableOpacity, TextInput } from 'react-native';
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
}

export default function Step3Page() {
  const router = useRouter();
  const [unitNumber, setUnitNumber] = useState('');
  const [password, setPassword] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    loadData();
  }, []);

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

  const addUser = () => {
    if (!newUserPhone) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }
    
    // Check if phone already exists
    if (users.some(user => user.phoneNumber === newUserPhone)) {
      Alert.alert('Error', 'This phone number is already authorized');
      return;
    }
    
    // Add user locally
    const newUser = {
      phoneNumber: newUserPhone,
      name: newUserName || 'User ' + (users.length + 1)
    };
    
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
    
    // Send command to add user to device
    sendSMS(`${password}WHL${newUserPhone}#`);
    
    // Clear form
    setNewUserPhone('');
    setNewUserName('');
    
    Alert.alert('Success', 'User added successfully');
  };

  const removeUser = (phoneNumber: string) => {
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
            const updatedUsers = users.filter(user => user.phoneNumber !== phoneNumber);
            setUsers(updatedUsers);
            saveUsers(updatedUsers);
            
            // Send command to remove user from device
            sendSMS(`${password}RHL${phoneNumber}#`);
          }
        }
      ]
    );
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
            </Text>
          </View>
          
          <TextInputField
            label="Phone Number"
            value={newUserPhone}
            onChangeText={setNewUserPhone}
            placeholder="Enter phone number with country code"
            keyboardType="phone-pad"
          />
          
          <TextInputField
            label="Name (Optional)"
            value={newUserName}
            onChangeText={setNewUserName}
            placeholder="Enter user name"
          />
          
          <Button
            title="Add User"
            onPress={addUser}
            loading={isLoading}
            disabled={!newUserPhone}
            icon={<Ionicons name="person-add-outline" size={20} color="white" />}
            fullWidth
          />
        </Card>
        
        <Card title="Authorized Users">
          {users.length === 0 ? (
            <Text style={styles.emptyText}>No authorized users yet.</Text>
          ) : (
            users.map((user, index) => (
              <View key={user.phoneNumber} style={[
                styles.userItem,
                index < users.length - 1 && styles.userItemBorder
              ]}>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userPhone}>{user.phoneNumber}</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => removeUser(user.phoneNumber)}
                >
                  <Ionicons name="trash-outline" size={22} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))
          )}
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
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  deleteButton: {
    padding: spacing.sm,
  },
  nextButton: {
    marginTop: spacing.lg,
  },
});