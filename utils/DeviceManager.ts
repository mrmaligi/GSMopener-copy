import { Alert } from 'react-native';
import DataStore from './DataStore';

/**
 * Utility class to handle device management operations
 */
export class DeviceManager {
  /**
   * Delete a device and handle all cleanup
   */
  static async deleteDevice(deviceId: string): Promise<boolean> {
    try {
      if (!deviceId) {
        console.error('Device ID is required for deletion');
        return false;
      }
      
      console.log(`DeviceManager: Deleting device ${deviceId}`);
      const dataStore = DataStore.getInstance();
      
      // First, get the device to log the name for reference
      const device = dataStore.getDeviceById(deviceId);
      
      // Delete the device from DataStore
      const success = await dataStore.deleteDevice(deviceId);
      
      if (success && device) {
        console.log(`DeviceManager: Successfully deleted device: ${device.name}`);
        return true;
      } else {
        console.error(`DeviceManager: Failed to delete device ${deviceId}`);
        return false;
      }
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
