import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { getDevices, updateDevice } from '../utils/deviceStorage';
import { addLog } from '../utils/logging';
import { StandardHeader } from './components/StandardHeader';
import { Button } from './components/Button';
import { Card } from './components/Card';
import { TextInputField } from './components/TextInputField';
import { colors, spacing, borderRadius } from './styles/theme';
import { DeviceData } from '../types/devices';
import { useDevices } from './contexts/DeviceContext';
import { useDataStore } from './contexts/DataStoreContext';
import DeviceManager from '../utils/DeviceManager';

export default function EditDevicePage() {
  const router = useRouter();
  const { deviceId } = useLocalSearchParams();
  const [device, setDevice] = useState<DeviceData | null>(null);
  const [deviceName, setDeviceName] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { refreshDevices, devices } = useDevices();
  const { deleteDevice } = useDataStore();

  useEffect(() => {
    if (deviceId) {
      loadDevice(String(deviceId));
    } else {
      Alert.alert('Error', 'No device ID provided');
      router.back();
    }
  }, [deviceId]);

  const loadDevice = async (id: string) => {
    setIsLoading(true);
    try {
      const devices = await getDevices();
      const foundDevice = devices.find(d => d.id === id);
      
      if (foundDevice) {
        setDevice(foundDevice);
        setDeviceName(foundDevice.name);
        setUnitNumber(foundDevice.unitNumber);
        setPassword(foundDevice.password);
      } else {
        Alert.alert('Error', 'Device not found');
        router.back();
      }
    } catch (error) {
      console.error('Failed to load device:', error);
      Alert.alert('Error', 'Failed to load device information');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    if (!deviceName.trim()) {
      Alert.alert('Error', 'Please enter a name for your device');
      return false;
    }
    
    if (!unitNumber.trim()) {
      Alert.alert('Error', 'Please enter the device phone number');
      return false;
    }
    
    if (!password.trim() || password.length !== 4 || !/^\d+$/.test(password)) {
      Alert.alert('Error', 'Password must be a 4-digit number');
      return false;
    }
    
    return true;
  };

  const handleSaveDevice = async () => {
    if (!validateForm() || !device) return;
    
    setIsSaving(true);
    
    try {
      const updatedDevice: DeviceData = {
        ...device,
        name: deviceName,
        unitNumber,
        password,
      };
      
      await updateDevice(updatedDevice);
      
      // Refresh the devices list to reflect the changes
      await refreshDevices();
      
      await addLog(
        'Device Management', 
        `Updated device: ${deviceName}`, 
        true
      );
      
      Alert.alert(
        'Device Updated',
        'The device has been updated successfully',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Failed to update device:', error);
      Alert.alert('Error', 'Failed to update device. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeleteDevice = () => {
    if (!device) return;
    
    // Check if this is the only device
    const isOnlyDevice = devices.length <= 1;
    
    Alert.alert(
      'Delete Device',
      `Are you sure you want to delete "${device.name}"?${isOnlyDevice ? ' This is your only device.' : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const success = await deleteDevice(device.id);
              if (success) {
                await refreshDevices();
                Alert.alert(
                  'Device Deleted',
                  'The device has been deleted successfully',
                  [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
                );
              } else {
                throw new Error('Failed to delete device');
              }
            } catch (error) {
              console.error('Failed to delete device:', error);
              Alert.alert('Error', 'Failed to delete device. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StandardHeader title="Edit Device" showBack />
        
        <View style={styles.loadingContainer}>
          <Text>Loading device information...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StandardHeader title="Edit Device" showBack />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Card title={`Edit ${device?.type || 'Device'}`} elevated>
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
          
          <TextInputField
            label="Device Password"
            value={password}
            onChangeText={(text) => {
              // Only allow digits and limit to 4 characters
              const filtered = text.replace(/[^0-9]/g, '').slice(0, 4);
              setPassword(filtered);
            }}
            placeholder="4-digit password"
            keyboardType="number-pad"
            containerStyle={styles.inputContainer}
            maxLength={4}
            secureTextEntry
          />
          
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Changes to the password here only update the local app record. To change the 
              device's actual password, use the "Change Password" option in the setup menu.
            </Text>
          </View>
        </Card>
        
        <View style={styles.buttonsContainer}>
          <Button
            title="Save Changes"
            onPress={handleSaveDevice}
            loading={isSaving}
            style={styles.saveButton}
            fullWidth
          />
          
          <Button
            title="Delete Device"
            onPress={handleDeleteDevice}
            loading={isDeleting}
            variant="secondary"
            icon="trash-outline"
            style={styles.deleteButton}
            fullWidth
          />
        </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: `${colors.primary}15`,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  infoText: {
    fontSize: 14,
    color: colors.text.secondary,
    flex: 1,
    marginLeft: spacing.sm,
  },
  buttonsContainer: {
    marginTop: spacing.md,
  },
  saveButton: {
    marginBottom: spacing.md,
  },
  deleteButton: {
    backgroundColor: `${colors.error}15`,
    borderColor: colors.error,
  },
});
