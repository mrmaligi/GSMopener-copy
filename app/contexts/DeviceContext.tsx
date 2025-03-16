import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceData } from '../../types/devices';
import { getDevices, getActiveDevice, setActiveDevice, migrateFromLegacyStorage } from '../../utils/deviceStorage';
import { migrateLegacyUsers, getDeviceUsers, saveDeviceUsers } from '../../utils/authorizedUsersStorage';
import { migrateLegacyLogs } from '../../utils/logger';

// Define type for user data
export interface User {
  id: string;
  name: string;
  phoneNumber: string;
  serialNumber: string;
  startTime?: string;
  endTime?: string;
}

type DeviceContextType = {
  devices: DeviceData[];
  activeDevice: DeviceData | null;
  setActiveDeviceById: (id: string) => Promise<void>;
  refreshDevices: () => Promise<void>;
  isLoading: boolean;
  deviceUsersKey: string | null; // For accessing the correct users for the current device
  getAuthorizedUsers: (deviceId?: string) => Promise<User[]>;
  saveAuthorizedUsers: (users: User[], deviceId?: string) => Promise<void>;
};

const DeviceContext = createContext<DeviceContextType>({
  devices: [],
  activeDevice: null,
  setActiveDeviceById: async () => {},
  refreshDevices: async () => {},
  isLoading: true,
  deviceUsersKey: null,
  getAuthorizedUsers: async () => [],
  saveAuthorizedUsers: async () => {},
});

export const useDevices = () => useContext(DeviceContext);

export const DeviceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [activeDevice, setActiveDevice] = useState<DeviceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceUsersKey, setDeviceUsersKey] = useState<string | null>(null);

  // Load devices on mount
  useEffect(() => {
    loadDevices();
  }, []);

  // Update deviceUsersKey when activeDevice changes
  useEffect(() => {
    if (activeDevice) {
      setDeviceUsersKey(`authorizedUsers_${activeDevice.id}`);
      // Attempt to migrate legacy users to device-specific storage
      migrateLegacyUsers(activeDevice.id);
      // Attempt to migrate legacy logs to device-specific storage
      migrateLegacyLogs(activeDevice.id);
    } else {
      setDeviceUsersKey(null);
    }
  }, [activeDevice]);

  const loadDevices = async () => {
    setIsLoading(true);
    try {
      // Try to migrate legacy data
      await migrateFromLegacyStorage();
      
      // Load all devices and the active one
      const allDevices = await getDevices();
      const currentActive = await getActiveDevice();
      
      setDevices(allDevices);
      setActiveDevice(currentActive);
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setActiveDeviceById = async (deviceId: string) => {
    try {
      // Update active device in storage
      await setActiveDevice(deviceId);
      
      // Find the device from our state
      const device = devices.find(d => d.id === deviceId);
      if (device) {
        // Update active device in state
        setActiveDevice(device);
      }
    } catch (error) {
      console.error('Failed to set active device:', error);
      throw error;
    }
  };

  // Get authorized users for a specific device or active device
  const getAuthorizedUsers = async (deviceId?: string): Promise<User[]> => {
    try {
      // Use provided deviceId or active device id or fall back to legacy
      const targetDeviceId = deviceId || activeDevice?.id;
      
      if (targetDeviceId) {
        // Try to get device-specific users
        const users = await getDeviceUsers(targetDeviceId);
        return users as User[];
      } else {
        // Fall back to legacy storage
        const legacyUsers = await AsyncStorage.getItem('authorizedUsers');
        return legacyUsers ? JSON.parse(legacyUsers) : [];
      }
    } catch (error) {
      console.error('Failed to get authorized users:', error);
      return [];
    }
  };

  // Save authorized users for a specific device
  const saveAuthorizedUsers = async (users: User[], deviceId?: string): Promise<void> => {
    try {
      // Always require a device ID - no more fallback to legacy storage
      const targetDeviceId = deviceId || activeDevice?.id;
      
      if (!targetDeviceId) {
        throw new Error("Cannot save users: No device ID provided and no active device");
      }
      
      // Save to device-specific storage
      await saveDeviceUsers(targetDeviceId, users);
      
      // Log for debugging
      console.log(`Saved ${users.length} users for device ${targetDeviceId}`);
    } catch (error) {
      console.error('Failed to save authorized users:', error);
      throw error;
    }
  };

  const value = {
    devices,
    activeDevice,
    setActiveDeviceById,
    refreshDevices: loadDevices,
    isLoading,
    deviceUsersKey,
    getAuthorizedUsers,
    saveAuthorizedUsers,
  };

  return (
    <DeviceContext.Provider value={value}>
      {children}
    </DeviceContext.Provider>
  );
};

export default DeviceProvider;
