import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { DeviceData } from '../../types/devices';
import { useDataStore } from './DataStoreContext';
import { Device, User } from '../../utils/DataStore';

// Define type for user data - use the one from DataStore
export { User } from '../../utils/DataStore'; // Fixed missing quote

// Function to convert DataStore Device to DeviceData
const convertToDeviceData = (device: Device, isActive: boolean): DeviceData => ({
  id: device.id,
  name: device.name,
  unitNumber: device.unitNumber,
  password: device.password,
  type: 'Connect4v', // Default type
  isActive: isActive,
  // Map relaySettings if available or provide defaults
  relaySettings: device.relaySettings || {
    accessControl: 'AUT',
    latchTime: '000'
  }
});

type DeviceContextType = {
  devices: DeviceData[];
  activeDevice: DeviceData | null;
  setActiveDeviceById: (id: string) => Promise<void>;
  refreshDevices: () => Promise<void>;
  isLoading: boolean;
  deviceUsersKey: string | null;
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
  const refreshInProgress = useRef(false);
  
  // Use our DataStore with added refreshStore capability
  const { 
    store, 
    isLoading: dataStoreLoading,
    getDeviceUsers,
    setActiveDevice: setActiveDeviceInStore,
    addUser,
    updateUser,
    authorizeUserForDevice,
    refreshStore
  } = useDataStore();
  
  // Load devices when DataStore is ready - fix dependencies
  const loadDevices = useCallback(async () => {
    if (refreshInProgress.current) return;
    refreshInProgress.current = true;
    
    console.log("DeviceContext: Loading devices...");
    setIsLoading(true);
    
    try {
      await refreshStore();
      
      // Get devices from DataStore
      const storeDevices = store.devices;
      console.log(`DeviceContext: Found ${storeDevices.length} devices in DataStore`);
      
      // Debug output of device IDs for troubleshooting
      if (storeDevices.length > 0) {
        console.log('Device IDs:', storeDevices.map(d => d.id).join(', '));
      }
      
      // Convert to DeviceData format
      const convertedDevices: DeviceData[] = storeDevices.map(device => 
        convertToDeviceData(device, device.id === store.globalSettings.activeDeviceId)
      );
      
      setDevices(prevDevices => {
        // Skip update if devices haven't changed
        if (JSON.stringify(prevDevices) === JSON.stringify(convertedDevices)) {
          return prevDevices;
        }
        return convertedDevices;
      });
      
      // Set active device
      const activeDeviceId = store.globalSettings.activeDeviceId;
      if (activeDeviceId) {
        const active = convertedDevices.find(d => d.id === activeDeviceId) || null;
        setActiveDevice(prev => {
          if (prev?.id === active?.id) return prev;
          return active;
        });
      }
    } catch (error) {
      console.error('DeviceContext: Failed to load devices:', error);
    } finally {
      setIsLoading(false);
      refreshInProgress.current = false;
    }
  }, [refreshStore, store.devices, store.globalSettings.activeDeviceId]);

  useEffect(() => {
    if (!dataStoreLoading) {
      loadDevices();
      console.log('Loading devices from DataStore');
    }
  }, [dataStoreLoading, loadDevices]);

  // Update deviceUsersKey when activeDevice changes
  useEffect(() => {
    if (activeDevice) {
      setDeviceUsersKey(`authorizedUsers_${activeDevice.id}`);
    } else {
      setDeviceUsersKey(null);
    }
  }, [activeDevice]);

  const setActiveDeviceById = async (deviceId: string) => {
    try {
      // Update active device in DataStore
      await setActiveDeviceInStore(deviceId);
      
      // Find and set the active device in state
      const device = devices.find(d => d.id === deviceId) || null;
      setActiveDevice(device);
    } catch (error) {
      console.error('Failed to set active device:', error);
      throw error;
    }
  };

  // Get authorized users for a specific device or active device
  const getAuthorizedUsers = async (deviceId?: string): Promise<User[]> => {
    try {
      // Refresh store to get latest data
      await refreshStore();
      
      // Use provided deviceId or active device id
      const targetDeviceId = deviceId || activeDevice?.id;
      
      if (targetDeviceId) {
        // Get device-specific users from DataStore
        return getDeviceUsers(targetDeviceId);
      } 
      return [];
    } catch (error) {
      console.error('Failed to get authorized users:', error);
      return [];
    }
  };

  // Save authorized users for a specific device
  const saveAuthorizedUsers = async (users: User[], deviceId?: string): Promise<void> => {
    try {
      const targetDeviceId = deviceId || activeDevice?.id;
      
      if (!targetDeviceId) {
        throw new Error("Cannot save users: No device ID provided and no active device");
      }
      
      // First, add any users that don't exist yet
      for (const user of users) {
        if (!user.id || user.id.startsWith('new_')) {
          // This is a new user, add it to the store
          const newUser = await addUser({
            name: user.name,
            phoneNumber: user.phoneNumber,
            serialNumber: user.serialNumber,
            startTime: user.startTime,
            endTime: user.endTime
          });
          
          // Authorize for this device
          await authorizeUserForDevice(targetDeviceId, newUser.id);
        } else {
          // Existing user, update it
          await updateUser(user.id, user);
          
          // Make sure it's authorized for this device
          await authorizeUserForDevice(targetDeviceId, user.id);
        }
      }
      
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
