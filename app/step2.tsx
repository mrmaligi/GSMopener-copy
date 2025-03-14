import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Platform, Linking, Alert, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { TextInputField } from './components/TextInputField';
import { Button } from './components/Button';
import { Card } from './components/Card';
import { colors, spacing, shadows, borderRadius } from './styles/theme';

const Header = ({ title, showBack = false, backTo = '' }) => {
  const router = useRouter();
  return (
    <View style={headerStyles.container}>
      <StatusBar style="dark" />
      {showBack && (
        <TouchableOpacity style={headerStyles.backButton} onPress={() => router.push(backTo)}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      )}
      <Text style={headerStyles.title}>{title}</Text>
      <View style={headerStyles.placeholder} />
    </View>
  );
};

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    ...shadows.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: borderRadius.md,
  },
  placeholder: {
    width: 40, // To balance the back button and center the title
  },
});

export default function Step2Page() {
  const [unitNumber, setUnitNumber] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const storedUnitNumber = await AsyncStorage.getItem('unitNumber');
      const storedPassword = await AsyncStorage.getItem('password');

      if (storedUnitNumber) setUnitNumber(storedUnitNumber);
      if (storedPassword) setPassword(storedPassword);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveToLocalStorage = async (newPass) => {
    try {
      await AsyncStorage.setItem('password', newPass);
      
      // Mark step as completed
      const savedCompletedSteps = await AsyncStorage.getItem('completedSteps');
      let completedSteps = savedCompletedSteps ? JSON.parse(savedCompletedSteps) : [];
      
      if (!completedSteps.includes('step2')) {
        completedSteps.push('step2');
        await AsyncStorage.setItem('completedSteps', JSON.stringify(completedSteps));
      }
      
      return true;
    } catch (error) {
      console.error('Failed to save new password:', error);
      return false;
    }
  };

  const sendSMS = async (command) => {
    if (!unitNumber) {
      Alert.alert('Error', 'GSM relay number not set. Please configure in Settings first.');
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
        return false;
      }

      await Linking.openURL(smsUrl);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Failed to send SMS:', error);
      Alert.alert(
        'Error',
        'Failed to open SMS. Please try again.',
        [{ text: 'OK' }]
      );
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
      <Header title="Change Password" showBack backTo="/setup" />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Card title="Change Admin Password" subtitle="Update the 4-digit password for the GSM relay" elevated>
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle-outline" size={24} color={colors.primary} style={styles.infoIcon} />
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
