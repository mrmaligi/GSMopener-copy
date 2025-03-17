import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { StandardHeader } from './components/StandardHeader';
import { Button } from './components/Button';
import { Card } from './components/Card';
import { TextInputField } from './components/TextInputField';
import { colors, spacing } from './styles/theme';
import { useDevices } from './contexts/DeviceContext';
import { useDataStore } from './contexts/DataStoreContext';

export default function AddDevicePage() {
  const router = useRouter();
  const { refreshDevices } = useDevices();
  const { addDevice, updateGlobalSettings } = useDataStore();
  const [deviceName, setDeviceName] = useState('');
  const [unitNumber, setUnitNumber] = useState('');  // Added field for phone number
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    if (!deviceName.trim()) {
      Alert.alert('Error', 'Please enter a name for your device');
      return false;
    }
    
    if (!unitNumber.trim()) {
      Alert.alert('Error', 'Please enter the device phone number');
      return false;
    }
    
    return true;
  };

  const handleAddDevice = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // Add the new device with all required fields properly initialized
      const newDevice = await addDevice({
        name: deviceName,
        unitNumber: unitNumber, // Use the entered phone number
        password: '1234', // Default password
        authorizedUsers: [],
        type: 'Connect4v',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        relaySettings: {
          accessControl: 'AUT',
          latchTime: '000'
        },
        isActive: true
      });

      // Set as active device
      await updateGlobalSettings({
        activeDeviceId: newDevice.id
      });
      
      // Refresh devices list
      await refreshDevices();
      
      // Navigate directly to step 1 with the new device ID
      router.push({
        pathname: '/step1',
        params: { deviceId: newDevice.id }
      });
    } catch (error) {
      console.error('Failed to add device:', error);
      Alert.alert('Error', 'Failed to add device. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StandardHeader title="Add New Device" showBack backTo="/devices" />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Card title="Device Information" elevated>
          <TextInputField
            label="Device Name"
            value={deviceName}
            onChangeText={setDeviceName}
            placeholder="Enter a name (e.g., Home Gate, Office Door)"
            containerStyle={styles.inputContainer}
          />
          
          <TextInputField
            label="Device Phone Number"
            value={unitNumber}
            onChangeText={setUnitNumber}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
            autoComplete="tel"
            containerStyle={styles.inputContainer}
          />
        </Card>
        
        <Button
          title="Continue to Setup"
          onPress={handleAddDevice}
          loading={isLoading}
          style={styles.addButton}
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
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  addButton: {
    marginTop: spacing.md,
  },
});
