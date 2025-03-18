import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { StandardHeader } from './components/StandardHeader';
import { Button } from './components/Button';
import { Card } from './components/Card';
import { TextInputField } from './components/TextInputField';
import { colors, spacing, borderRadius } from './styles/theme';
import { useDevices } from './contexts/DeviceContext';
import { useDataStore } from './contexts/DataStoreContext';
import DeviceManager from '../utils/DeviceManager';

export default function EditDevicePage() {
  const router = useRouter();
  const { deviceId } = useLocalSearchParams();
  const [device, setDevice] = useState<any>(null);
  const [deviceName, setDeviceName] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { refreshDevices } = useDevices();
  const { getDeviceById, updateDevice, addDeviceLog } = useDataStore();

  useEffect(() => {
    if (!deviceId) {
      Alert.alert('Error', 'No device ID provided');
      router.back();
      return;
    }
    
    loadDevice(String(deviceId));
  }, [deviceId]);

  const loadDevice = async (id: string) => {
    setIsLoading(true);
    try {
      // Use DataStore to get device information
      const foundDevice = getDeviceById(id);
      
      if (foundDevice) {
        setDevice(foundDevice);
        setDeviceName(foundDevice.name);
        setUnitNumber(foundDevice.unitNumber);
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
    
    return true;
  };

  const handleSaveDevice = async () => {
    if (!validateForm() || !device) return;
    
    setIsSaving(true);
    
    try {
      // Use DataStore to update the device
      await updateDevice(device.id, {
        name: deviceName,
        unitNumber,
      });
      
      // Refresh devices list and add log entry
      await refreshDevices();
      await addDeviceLog(
        device.id,
        'Device Management', 
        `Updated device: ${deviceName}`, 
        true,
        'settings'
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
    
    Alert.alert(
      'Delete Device',
      `Are you sure you want to delete "${device.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const success = await DeviceManager.deleteDevice(device.id);
              
              if (success) {
                await refreshDevices();
                Alert.alert(
                  'Device Deleted',
                  'The device has been deleted successfully',
                  [{ text: 'OK', onPress: () => router.replace('/devices') }]
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
          
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              To change the device's password, use the "Change Password" option in the setup menu.
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
