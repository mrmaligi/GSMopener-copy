import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceData } from '../types/devices';

const DEVICES_STORAGE_KEY = 'gsm_devices';
const ACTIVE_DEVICE_KEY = 'active_device_id';

// Simple UUID generator for React Native environment
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Get all stored devices
export const getDevices = async (): Promise<DeviceData[]> => {
  try {
    const deviceData = await AsyncStorage.getItem(DEVICES_STORAGE_KEY);
    if (deviceData) {
      return JSON.parse(deviceData);
    }
    return [];
  } catch (error) {
    console.error('Failed to get devices:', error);
    return [];
  }
};

// Add a new device
export const addDevice = async (device: Omit<DeviceData, 'id'>): Promise<DeviceData> => {
  try {
    const devices = await getDevices();
    
    // Create new device with ID
    const newDevice: DeviceData = {
      ...device,
      id: generateUUID() // Use our custom UUID generator
    };
    
    // Add to storage
    await AsyncStorage.setItem(DEVICES_STORAGE_KEY, JSON.stringify([...devices, newDevice]));
    
    // If this is the first device, set it as active
    if (devices.length === 0) {
      await setActiveDevice(newDevice.id);
    }
    
    return newDevice;
  } catch (error) {
    console.error('Failed to add device:', error);
    throw error;
  }
};

// Update an existing device
export const updateDevice = async (device: DeviceData): Promise<void> => {
  try {
    const devices = await getDevices();
    const updatedDevices = devices.map(d => d.id === device.id ? device : d);
    await AsyncStorage.setItem(DEVICES_STORAGE_KEY, JSON.stringify(updatedDevices));
  } catch (error) {
    console.error('Failed to update device:', error);
    throw error;
  }
};

// Delete a device
export const deleteDevice = async (deviceId: string): Promise<boolean> => {
  try {
    console.log(`deviceStorage: Deleting device ${deviceId}`);
    
    // Get current devices
    const devices = await getDevices();
    const initialCount = devices.length;
    
    // Debug the device IDs - this helps us see what's happening
    console.log('deviceStorage: Current device IDs:', devices.map(d => d.id));
    
    // Ensure the device ID is properly formatted for comparison
    const targetId = String(deviceId).trim();
    
    // Filter out the device to delete with more careful comparison
    const updatedDevices = devices.filter(d => {
      const currentId = String(d.id).trim();
      const isMatch = currentId !== targetId;
      if (!isMatch) {
        console.log(`deviceStorage: Found device to remove: ${d.name || 'Unnamed'} (${d.id})`);
      }
      return isMatch;
    });
    
    console.log(`deviceStorage: Filtered from ${initialCount} to ${updatedDevices.length} devices`);
    
    // If no device was removed, return false
    if (initialCount === updatedDevices.length) {
      console.log(`deviceStorage: No device found with ID ${deviceId}`);
      return false;
    }
    
    // Save updated list
    await AsyncStorage.setItem(DEVICES_STORAGE_KEY, JSON.stringify(updatedDevices));
    
    // If the deleted device was the active one, update the active device
    const activeId = await getActiveDeviceId();
    if (activeId && activeId.trim() === targetId) {
      console.log('deviceStorage: Deleted device was active, updating active device');
      
      if (updatedDevices.length > 0) {
        // Set first device as active
        await setActiveDevice(updatedDevices[0].id);
        console.log(`deviceStorage: New active device: ${updatedDevices[0].id}`);
      } else {
        // Clear active device if no devices remain
        await AsyncStorage.removeItem(ACTIVE_DEVICE_KEY);
        console.log('deviceStorage: No devices remain, cleared active device');
      }
    }
    
    return true;
  } catch (error) {
    console.error('Failed to delete device:', error);
    return false;
  }
};

// Get the active device ID
export const getActiveDeviceId = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(ACTIVE_DEVICE_KEY);
  } catch (error) {
    console.error('Failed to get active device ID:', error);
    return null;
  }
};

// Set the active device
export const setActiveDevice = async (deviceId: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(ACTIVE_DEVICE_KEY, deviceId);
  } catch (error) {
    console.error('Failed to set active device:', error);
    throw error;
  }
};

// Get the currently active device data
export const getActiveDevice = async (): Promise<DeviceData | null> => {
  try {
    const activeId = await getActiveDeviceId();
    if (!activeId) return null;
    
    const devices = await getDevices();
    return devices.find(d => d.id === activeId) || null;
  } catch (error) {
    console.error('Failed to get active device:', error);
    return null;
  }
};

// Migration function to convert old single-device storage to new format
export const migrateFromLegacyStorage = async (): Promise<boolean> => {
  try {
    // Check if we already have devices stored
    const existingDevices = await getDevices();
    if (existingDevices.length > 0) {
      return false; // Already migrated
    }
    
    // Get legacy data
    const unitNumber = await AsyncStorage.getItem('unitNumber');
    const password = await AsyncStorage.getItem('password');
    const relaySettingsStr = await AsyncStorage.getItem('relaySettings');
    
    // Only proceed if we have at least a unit number
    if (!unitNumber) {
      return false;
    }
    
    // Create device from legacy data
    const device: Omit<DeviceData, 'id'> = {
      name: 'My Connect4v',
      unitNumber,
      password: password || '1234',
      type: 'Connect4v',
      isActive: true,
      relaySettings: relaySettingsStr ? JSON.parse(relaySettingsStr) : {
        accessControl: 'AUT',
        latchTime: '000'
      }
    };
    
    // Add the device
    await addDevice(device);
    return true;
  } catch (error) {
    console.error('Migration error:', error);
    return false;
  }
};
