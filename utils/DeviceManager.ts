import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DataStore from './DataStore';
import { safeGetItem, safeSetItem, safeRemoveItem, safeMultiRemove } from './storageUtils';

// Constants for storage keys
export const DEVICES_STORAGE_KEY = 'gsm_devices';
export const ACTIVE_DEVICE_KEY = 'active_device_id';

/**
 * Unified Device Management class
 * Single source of truth for all device operations
 */
export class DeviceManager {
  /**
   * Delete a device and handle all cleanup
   */
  static async deleteDevice(deviceId: string): Promise<boolean> {
    try {
      if (!deviceId || typeof deviceId !== 'string') {
        console.error('DeviceManager: Invalid deviceId for deletion:', deviceId);
        return false;
      }
      
      console.log(`DeviceManager: Deleting device ${deviceId}`);
      const dataStore = DataStore.getInstance();
      await dataStore.initialize();
      
      // Get device info for reference
      const device = dataStore.getDeviceById(deviceId);
      console.log(`DeviceManager: Deleting device: ${device?.name || 'Unknown'}`);
      
      // PRIMARY: Delete from DataStore
      const dataStoreSuccess = await dataStore.deleteDevice(deviceId);
      
      // SECONDARY: Clean up AsyncStorage (legacy approach)
      let legacyStorageSuccess = false;
      try {
        const devicesJson = await safeGetItem(DEVICES_STORAGE_KEY);
        if (devicesJson) {
          const devices = JSON.parse(devicesJson);
          const originalLength = devices.length;
          const filteredDevices = devices.filter(d => d.id !== deviceId);
          
          if (originalLength !== filteredDevices.length) {
            await safeSetItem(DEVICES_STORAGE_KEY, JSON.stringify(filteredDevices));
            legacyStorageSuccess = true;
            
            // Update active device if needed
            const activeId = await safeGetItem(ACTIVE_DEVICE_KEY);
            if (activeId === deviceId) {
              if (filteredDevices.length > 0) {
                await safeSetItem(ACTIVE_DEVICE_KEY, filteredDevices[0].id);
              } else {
                await safeRemoveItem(ACTIVE_DEVICE_KEY);
              }
            }
          }
        }
      } catch (storageError) {
        console.warn('DeviceManager: Legacy storage cleanup failed:', storageError);
      }
      
      // Clean up device-specific data keys
      try {
        if (deviceId && typeof deviceId === 'string') {
          const deviceKeys = [
            `authorizedUsers_${deviceId}`,
            `app_logs_${deviceId}`,
            `relaySettings_${deviceId}`
          ];
          
          await safeMultiRemove(deviceKeys);
        }
      } catch (cleanupError) {
        console.warn('DeviceManager: Error cleaning up device-specific keys:', cleanupError);
      }
      
      // Consider success if either method worked
      const success = dataStoreSuccess || legacyStorageSuccess;
      
      if (success) {
        console.log(`DeviceManager: Successfully deleted device: ${device?.name || deviceId}`);
      } else {
        console.error(`DeviceManager: Failed to delete device ${deviceId}`);
      }
      
      return success;
    } catch (error) {
      console.error('DeviceManager: Error deleting device:', error);
      return false;
    }
  }
  
  /**
   * Confirm device deletion with user
   */
  static confirmDeviceDeletion(
    deviceId: string, 
    deviceName: string, 
    isActive: boolean, 
    onConfirm: (id: string) => Promise<void>
  ) {
    const title = isActive ? 'Delete Active Device' : 'Delete Device';
    const message = isActive 
      ? `You are about to delete "${deviceName}", which is your currently active device. This will permanently remove all data associated with this device.`
      : `Are you sure you want to delete "${deviceName}"? This will permanently remove all data associated with this device.`;
      
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => onConfirm(deviceId)
        }
      ]
    );
  }
}

export default DeviceManager;