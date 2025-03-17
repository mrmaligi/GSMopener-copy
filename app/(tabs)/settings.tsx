import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Switch, Platform, Alert, Share, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { colors, spacing, shadows, borderRadius } from '../styles/theme';
import { useTheme } from '../contexts/ThemeContext';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { addLog } from '../utils/logger';
import { StandardHeader } from '../components/StandardHeader';
import { Ionicons } from '@expo/vector-icons';
import { useDevices } from '../contexts/DeviceContext';
import { mapIoniconName } from '../utils/iconMapping';
import { useDataStore } from '../contexts/DataStoreContext';
import { saveBackupToFile, shareBackup, pickAndRestoreBackup, restoreFromBackup as restoreBackupFromFile } from '../../utils/backupRestore';
// Import device storage constants directly
import { DEVICES_STORAGE_KEY, ACTIVE_DEVICE_KEY } from '../../utils/deviceStorage';

// Define a device interface
interface Device {
  id: string;
  name: string;
  unitNumber: string;
  type: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Use theme context and devices context
  const { isDarkMode, setDarkMode, colors: themeColors } = useTheme();
  const { devices: deviceList, activeDevice, setActiveDeviceById, refreshDevices } = useDevices();
  const { createBackup, restoreFromBackup: restoreDataStore, addDeviceLog, deleteDevice, store } = useDataStore();

  useEffect(() => {
    loadSettings();
    // Set devices from the DeviceContext
    if (deviceList) {
      setDevices(deviceList);
    }
  }, [deviceList]);

  const loadSettings = async () => {
    try {
      const storedNotifications = await AsyncStorage.getItem('notificationsEnabled');
      if (storedNotifications) setNotificationsEnabled(storedNotifications === 'true');
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveNotificationSetting = async (value) => {
    setNotificationsEnabled(value);
    try {
      await AsyncStorage.setItem('notificationsEnabled', value.toString());
    } catch (error) {
      console.error('Failed to save notification setting:', error);
    }
  };

  // Device Management Functions
  const handleAddDevice = () => {
    router.push('/device-add');
  };

  const handleEditDevice = (deviceId: string) => {
    router.push({
      pathname: '/device-edit',
      params: { deviceId }
    });
  };

  const handleSetActiveDevice = async (deviceId: string) => {
    try {
      await setActiveDeviceById(deviceId);
      Alert.alert('Success', 'Active device changed successfully');
    } catch (error) {
      console.error('Failed to change active device:', error);
      Alert.alert('Error', 'Failed to change active device');
    }
  };

  const handleManageDevices = () => {
    router.push('/devices');
  };

  // Add function to remove a device
  const removeDevice = async (deviceId: string) => {
    try {
      // First check if this is the active device
      if (activeDevice && activeDevice.id === deviceId) {
        Alert.alert(
          'Active Device',
          'You are trying to delete the currently active device. This will remove all data associated with this device. Do you want to continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Delete', 
              style: 'destructive', 
              onPress: async () => {
                await confirmDeleteDevice(deviceId);
              } 
            }
          ]
        );
      } else {
        Alert.alert(
          'Delete Device',
          'Are you sure you want to delete this device? All associated data will be permanently removed.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Delete', 
              style: 'destructive', 
              onPress: async () => {
                await confirmDeleteDevice(deviceId);
              } 
            }
          ]
        );
      }
    } catch (error) {
      console.error('Failed to remove device:', error);
      Alert.alert('Error', 'Failed to remove device');
    }
  };
  
  const confirmDeleteDevice = async (deviceId: string) => {
    setIsLoading(true);
    try {
      // Validate deviceId to prevent undefined key issues
      if (!deviceId) {
        console.error('Invalid deviceId: empty or undefined');
        Alert.alert('Error', 'Invalid device ID');
        return;
      }
      
      console.log(`Confirming device deletion for ID: ${deviceId}`);
      
      // Try AsyncStorage direct deletion first
      try {
        // Get all devices from AsyncStorage
        const devicesJson = await AsyncStorage.getItem(DEVICES_STORAGE_KEY);
        if (devicesJson) {
          let allDevices = JSON.parse(devicesJson);
          
          // Remove the target device
          const filteredDevices = allDevices.filter(d => d.id !== deviceId);
          
          // Save updated device list
          await AsyncStorage.setItem(DEVICES_STORAGE_KEY, JSON.stringify(filteredDevices));
          
          // Handle active device if needed
          const activeId = await AsyncStorage.getItem(ACTIVE_DEVICE_KEY);
          if (activeId === deviceId && filteredDevices.length > 0) {
            // Set new active device
            await AsyncStorage.setItem(ACTIVE_DEVICE_KEY, filteredDevices[0].id);
          } else if (activeId === deviceId) {
            // Clear active device
            await AsyncStorage.removeItem(ACTIVE_DEVICE_KEY);
          }
        }
      } catch (storageError) {
        console.error('AsyncStorage deletion error:', storageError);
      }
      
      // Also attempt DataStore deletion
      console.log(`Attempting to delete device: ${deviceId}`);
      const success = await deleteDevice(deviceId);
      
      // Refresh the devices list
      await refreshDevices();
      
      // Update local devices state - avoid potential undefined lists
      const updatedDevices = await deviceList || [];
      setDevices(updatedDevices);
      
      Alert.alert('Success', 'Device deleted successfully');
    } catch (error) {
      console.error('Failed to delete device:', error);
      Alert.alert('Error', 'Failed to delete device: ' + (error?.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Backup and restore functions
  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      // Use our new backup function
      const filePath = await saveBackupToFile();
      
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        // Share the backup file
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: 'Save GSM Opener Backup',
          UTI: 'public.json' // For iOS
        });
        
        // Log the action
        if (activeDevice?.id) {
          await addDeviceLog(activeDevice.id, 'Backup', 'App data backup created and shared as JSON file', true);
        }
      } else {
        // Fallback if file sharing isn't available
        const backupData = await FileSystem.readAsStringAsync(filePath);
        const shareResult = await Share.share({
          message: backupData,
          title: 'GSM Opener Backup Data'
        });
        
        if (shareResult.action === Share.sharedAction && activeDevice?.id) {
          await addDeviceLog(activeDevice.id, 'Backup', 'App data backup created and shared as text', true);
        }
      }
      
      Alert.alert('Success', 'Backup created successfully!');
    } catch (error) {
      console.error('Failed to create backup:', error);
      if (activeDevice?.id) {
        await addDeviceLog(activeDevice.id, 'Backup', `Error creating backup: ${error.message}`, false);
      }
      Alert.alert('Error', 'Failed to create backup: ' + error.message);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const pickBackupFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true
      });
      
      if (result.canceled) {
        return;
      }
      
      // On newer expo-document-picker versions
      const fileUri = result.assets?.[0]?.uri || result.uri;
      
      // Now read the file
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      
      Alert.alert(
        'Restore Backup',
        'Do you want to restore data from this backup file? This will overwrite all current app data.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Restore', onPress: () => handleRestoreBackup(fileContent) }
        ]
      );
    } catch (error) {
      console.error('Error picking file:', error);
      await addLog('Restore', `Error picking backup file: ${error.message}`, false);
      Alert.alert('Error', 'Could not read backup file: ' + error.message);
    }
  };

  const handleRestoreBackup = async (fileContent: string) => {
    setIsRestoring(true);
    try {
      console.log('Starting backup restore process...');
      
      if (!fileContent) {
        throw new Error('Empty backup file');
      }
      
      try {
        console.log(`Processing backup with ${fileContent.length} characters`);
        
        // Add a debug preview of the content
        if (fileContent.length > 50) {
          console.log('Content preview:', fileContent.substring(0, 50) + '...');
        }
        
        // IMPORTANT: Use the file-based restore function, not the DataStore one
        const success = await restoreBackupFromFile(fileContent);
        
        if (success) {
          console.log('Restore operation successful!');
          Alert.alert(
            'Success',
            'Your backup has been restored successfully! The app will now restart.',
            [{
              text: 'OK',
              onPress: () => {
                setTimeout(() => router.replace('/'), 500);
              }
            }]
          );
        } else {
          throw new Error('Restore operation failed');
        }
      } catch (error) {
        console.error('Restore failed:', error);
        Alert.alert('Restore Failed', `Unable to restore your backup: ${error.message}`);
      }
    } catch (error) {
      console.error('Backup process error:', error);
      Alert.alert('Error', `Failed to process backup file: ${error.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  // Use dynamic styles based on theme
  const dynamicStyles = {
    container: {
      backgroundColor: themeColors.background,
    },
    text: {
      color: themeColors.text.primary
    }
  };

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StandardHeader title="Settings" />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Device Management Card */}
        <Card title="Device Management" subtitle="Manage your connected devices">
          <View style={styles.deviceList}>
            {devices.length === 0 ? (
              <View style={styles.emptyDeviceContainer}>
                <Text style={styles.emptyMessage}>No devices configured</Text>
                <Text style={styles.emptySubMessage}>Add your first device to get started</Text>
              </View>
            ) : (
              devices.map(device => (
                <View key={device.id} style={styles.deviceItem}>
                  <View style={styles.deviceInfo}>
                    <View style={styles.deviceIcon}>
                      <Ionicons 
                        name={device.type === 'Connect4v' ? 'hardware-chip' : 'musical-note'} 
                        size={20} 
                        color={themeColors.primary} 
                      />
                    </View>
                    <View style={styles.deviceDetails}>
                      <Text style={[styles.deviceName, dynamicStyles.text]}>{device.name}</Text>
                      <Text style={styles.deviceType}>{device.type} • {device.unitNumber}</Text>
                    </View>
                  </View>
                  <View style={styles.deviceControls}>
                    {device.id === activeDevice?.id ? (
                      <View style={[styles.activeDeviceBadge, { backgroundColor: `${themeColors.success}15` }]}>
                        <Ionicons name="checkmark-circle" size={16} color={themeColors.success} />
                        <Text style={[styles.activeDeviceText, { color: themeColors.success }]}>Active</Text>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={[styles.setActiveButton, { backgroundColor: `${themeColors.primary}15` }]}
                        onPress={() => handleSetActiveDevice(device.id)}
                      >
                        <Text style={[styles.setActiveText, { color: themeColors.primary }]}>Set Active</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={() => handleEditDevice(device.id)}
                    >
                      <Ionicons name="create-outline" size={20} color={themeColors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.removeButton}
                      onPress={() => removeDevice(device.id)}
                    >
                      <Ionicons name="trash-outline" size={20} color={themeColors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
          <View style={styles.deviceButtonsRow}>
            <Button 
              title="Add Device" 
              icon="add-circle" 
              onPress={handleAddDevice} 
              style={[styles.deviceButton, { flex: 1 }]}
            />
            {devices.length > 1 && (
              <Button 
                title="Manage All" 
                icon="settings-outline" 
                onPress={handleManageDevices} 
                variant="outline"
                style={[styles.deviceButton, { flex: 1, marginLeft: spacing.sm }]}
              />
            )}
          </View>
        </Card>

        {/* App Preferences */}
        <Card title="App Preferences">
          <View style={styles.preferenceRow}>
            <View style={styles.preferenceTextContainer}>
              <Text style={[styles.preferenceLabel, dynamicStyles.text]}>Enable Notifications</Text>
              <Text style={[styles.preferenceDescription, { color: themeColors.text.secondary }]}>
                Receive alerts when gate is opened
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={saveNotificationSetting}
              trackColor={{ false: '#E5E7EB', true: themeColors.primary }}
              thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : isDarkMode ? themeColors.primary : '#F9FAFB'}
            />
          </View>

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceTextContainer}>
              <Text style={[styles.preferenceLabel, dynamicStyles.text]}>Dark Mode</Text>
              <Text style={[styles.preferenceDescription, { color: themeColors.text.secondary }]}>
                Use dark color theme
              </Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#E5E7EB', true: themeColors.primary }}
              thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : isDarkMode ? themeColors.primary : '#F9FAFB'}
            />
          </View>
        </Card>

        {/* Backup & Restore Section */}
        <Card title="Data Management">
          <Text style={[styles.backupDescription, { color: themeColors.text.secondary }]}>
            Create a backup of all app data as a JSON file that you can save and use later to restore your settings if needed.
          </Text>
          <View style={styles.buttonContainer}>
            <Button
              title="Create Backup File"
              onPress={() => {
                Alert.alert(
                  'Create Backup',
                  'This will create a JSON backup file with all your app data. Continue?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Create Backup', onPress: handleCreateBackup }
                  ]
                );
              }}
              loading={isCreatingBackup}
              style={styles.actionButton}
            />
            
            <Button
              title="Restore from JSON File"
              onPress={pickBackupFile}
              loading={isRestoring}
              variant="outline"
              style={styles.actionButton}
            />
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  preferenceTextContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 14,
  },
  backupDescription: {
    fontSize: 14,
    marginBottom: spacing.md,
  },
  buttonContainer: {
    marginTop: spacing.sm,
  },
  actionButton: {
    marginBottom: spacing.sm,
  },
  deviceList: {
    marginBottom: spacing.sm,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeDeviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  activeDeviceText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  setActiveButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  setActiveText: {
    fontSize: 12,
    fontWeight: '500',
  },
  editButton: {
    padding: 6,
    marginRight: 4,
  },
  removeButton: {
    padding: 8,
  },
  emptyDeviceContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  emptyMessage: {
    textAlign: 'center',
    fontSize: 16,
    color: 'rgba(0,0,0,0.5)',
    marginBottom: spacing.xs,
  },
  emptySubMessage: {
    textAlign: 'center',
    fontSize: 14,
    color: 'rgba(0,0,0,0.4)',
  },
  deviceButtonsRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  deviceButton: {
    minWidth: 120,
  },
  emptyMessage: {
    textAlign: 'center',
    padding: 16,
    color: 'rgba(0,0,0,0.5)',
  },
  addDeviceButton: {
    marginTop: spacing.sm,
  },
});
