import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import DataStore, { Device, User, LogEntry, GlobalSettings } from '../../utils/DataStore';

interface DataStoreContextType {
  store: {
    devices: Device[];
    users: User[];
    globalSettings: GlobalSettings;
  };
  isLoading: boolean;
  error: Error | null;
  refreshStore: () => Promise<void>;
  // Device operations
  getDeviceById: (deviceId: string) => Device | null;
  addDevice: (device: Omit<Device, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Device>;
  updateDevice: (deviceId: string, updates: Partial<Device>) => Promise<Device | null>;
  deleteDevice: (deviceId: string) => Promise<boolean>;
  setActiveDevice: (deviceId: string | null) => Promise<boolean>;
  // User operations
  getDeviceUsers: (deviceId: string) => User[];
  addUser: (user: Omit<User, 'id'>) => Promise<User>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<User | null>;
  deleteUser: (userId: string) => Promise<boolean>;
  // Authorization operations
  authorizeUserForDevice: (deviceId: string, userId: string) => Promise<boolean>;
  deauthorizeUserForDevice: (deviceId: string, userId: string) => Promise<boolean>;
  // Log operations
  addDeviceLog: (
    deviceId: string, 
    action: string, 
    details: string, 
    success?: boolean,
    category?: 'relay' | 'settings' | 'user' | 'system'
  ) => Promise<LogEntry>;
  logSMSOperation: (
    deviceId: string,
    command: string,
    success?: boolean
  ) => Promise<LogEntry>;
  getDeviceLogs: (deviceId: string) => LogEntry[];
  clearDeviceLogs: (deviceId: string) => Promise<boolean>;
  // Global settings
  updateGlobalSettings: (updates: Partial<GlobalSettings>) => Promise<GlobalSettings>;
  // Backup & restore
  createBackup: () => string;
  restoreFromBackup: (backupJson: string) => Promise<boolean>;
}

const DataStoreContext = createContext<DataStoreContextType | undefined>(undefined);

export const DataStoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dataStore] = useState(DataStore.getInstance());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isRefreshing = useRef(false);
  const [store, setStore] = useState<{
    devices: Device[];
    users: User[];
    globalSettings: GlobalSettings;
  }>({
    devices: [],
    users: [],
    globalSettings: {
      adminNumber: '',
      activeDeviceId: null,
      completedSteps: []
    }
  });

  // Initialize the data store
  useEffect(() => {
    const initializeStore = async () => {
      setIsLoading(true);
      try {
        console.log("DataStoreContext: Initializing DataStore...");
        await dataStore.initialize();
        const storeData = dataStore.getStore();
        console.log(`DataStoreContext: Data loaded - ${storeData.devices.length} devices, ${storeData.users.length} users`);
        
        setStore({
          devices: storeData.devices,
          users: storeData.users,
          globalSettings: storeData.globalSettings
        });
        setError(null);
      } catch (err) {
        console.error("DataStore initialization error:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };

    initializeStore();
  }, []);

  // Add a refreshStore method to manually refresh data from DataStore
  const refreshStore = useCallback(async () => {
    // Skip if already refreshing
    if (isRefreshing.current) return;
    isRefreshing.current = true;
    
    try {
      const storeData = dataStore.getStore();
      
      // Use functional form of setState to safely check if data has changed
      setStore(prevStore => {
        // Skip update if data hasn't actually changed
        if (JSON.stringify({
          devices: prevStore.devices,
          users: prevStore.users,
          globalSettings: prevStore.globalSettings
        }) === JSON.stringify({
          devices: storeData.devices,
          users: storeData.users,
          globalSettings: storeData.globalSettings
        })) {
          return prevStore; // No change needed
        }
        
        // Return new state only if different
        return {
          devices: storeData.devices,
          users: storeData.users,
          globalSettings: storeData.globalSettings
        };
      });
    } catch (err) {
      console.error("Failed to refresh store:", err);
    } finally {
      isRefreshing.current = false;
    }
  }, []);

  // Create the context value with all DataStore methods
  const contextValue: DataStoreContextType = {
    store,
    isLoading,
    error,
    refreshStore,
    // Device operations
    getDeviceById: (deviceId) => dataStore.getDeviceById(deviceId),
    addDevice: async (device) => {
      try {
        // Validate required fields
        if (!device.name || !device.unitNumber || !device.password) {
          throw new Error('Missing required device fields');
        }
        
        // Ensure authorizedUsers exists
        const deviceToAdd = {
          ...device,
          authorizedUsers: device.authorizedUsers || []
        };
        
        console.log('Adding new device:', {
          name: deviceToAdd.name,
          unitNumber: deviceToAdd.unitNumber
        });
        
        const newDevice = await dataStore.addDevice(deviceToAdd);
        await refreshStore();
        return newDevice;
      } catch (error) {
        console.error('DataStoreContext: Error adding device:', error);
        throw error;  // Re-throw to allow components to handle it
      }
    },
    updateDevice: async (deviceId, updates) => {
      const updatedDevice = await dataStore.updateDevice(deviceId, updates);
      await refreshStore();
      return updatedDevice;
    },
    deleteDevice: async (deviceId) => {
      try {
        console.log(`Attempting to delete device: ${deviceId}`);
        const success = await dataStore.deleteDevice(deviceId);
        
        if (success) {
          console.log(`Device ${deviceId} deleted successfully`);
          await refreshStore();
          
          // Log the deletion
          await dataStore.addDeviceLog(
            deviceId, 
            'Device Management', 
            'Device deleted', 
            true, 
            'system'
          );
        } else {
          console.error(`Failed to delete device ${deviceId}`);
        }
        
        return success;
      } catch (error) {
        console.error('Error deleting device:', error);
        return false;
      }
    },
    setActiveDevice: async (deviceId) => {
      const success = await dataStore.setActiveDevice(deviceId);
      if (success) {
        await refreshStore();
      }
      return success;
    },
    // User operations
    getDeviceUsers: (deviceId) => dataStore.getDeviceUsers(deviceId),
    addUser: async (user) => {
      const newUser = await dataStore.addUser(user);
      await refreshStore();
      return newUser;
    },
    updateUser: async (userId, updates) => {
      const updatedUser = await dataStore.updateUser(userId, updates);
      await refreshStore();
      return updatedUser;
    },
    deleteUser: async (userId) => {
      const success = await dataStore.deleteUser(userId);
      if (success) {
        await refreshStore();
      }
      return success;
    },
    // Authorization operations
    authorizeUserForDevice: async (deviceId, userId) => {
      const success = await dataStore.authorizeUserForDevice(deviceId, userId);
      if (success) {
        await refreshStore();
      }
      return success;
    },
    deauthorizeUserForDevice: async (deviceId, userId) => {
      const success = await dataStore.deauthorizeUserForDevice(deviceId, userId);
      if (success) {
        await refreshStore();
      }
      return success;
    },
    // Log operations
    addDeviceLog: async (deviceId, action, details, success = true, category = 'system') => {
      const logEntry = await dataStore.addDeviceLog(deviceId, action, details, success, category);
      return logEntry;
    },
    // Enhanced method for logging SMS commands
    logSMSOperation: async (deviceId, command, success = true) => {
      let action = 'Unknown Command';
      let category: 'relay' | 'settings' | 'user' | 'system' = 'relay';
      let details = command;
      
      // Create a masked command to protect sensitive information like passwords
      const maskedCommand = command.replace(/\d{4}[A-Z]/, '****$&'.slice(4));

      // Determine command type - with improved human-readable descriptions
      if (command.includes('CC')) {
        action = 'Gate Open Command';
        details = `Sent command to activate relay (open gate): ${maskedCommand}`;
      } else if (command.includes('DD')) {
        action = 'Gate Close Command';
        details = `Sent command to deactivate relay (close gate): ${maskedCommand}`;
      } else if (command.includes('GOT')) {
        action = 'Relay Timing Setting';
        category = 'settings';
        const time = command.match(/GOT(\d{3})/)?.[1] || 'unknown';
        details = `Set relay timing to ${time === '000' ? 'toggle mode' : `${time} seconds`}: ${maskedCommand}`;
      } else if (command.includes('ALL')) {
        action = 'Access Control Setting';
        category = 'settings';
        details = `Set access mode to "Allow All" (any caller with password): ${maskedCommand}`;
      } else if (command.includes('AUT')) {
        action = 'Access Control Setting';
        category = 'settings';
        details = `Set access mode to "Authorized Only": ${maskedCommand}`;
      } else if (command.includes('TEL')) {
        action = 'Admin Registration';
        category = 'settings';
        details = `Registered administrator phone number: ${maskedCommand}`;
      } else if (command.includes('EE')) {
        action = 'Status Check';
        category = 'system';
        details = `Requested device status: ${maskedCommand}`;
      } else if (command.match(/P\d{4}\d{4}#/)) {
        action = 'Password Change';
        category = 'settings';
        details = `Changed device password: ${maskedCommand}`;
      } else if (command.match(/A\d{3}#[^#]+#/)) {
        action = 'User Management';
        category = 'user';
        details = `Added authorized user: ${maskedCommand}`;
      } else if (command.match(/A\d{3}##/)) {
        action = 'User Management';
        category = 'user';
        details = `Removed authorized user: ${maskedCommand}`;
      }

      return dataStore.addDeviceLog(deviceId, action, details, success, category);
    },
    getDeviceLogs: (deviceId) => dataStore.getDeviceLogs(deviceId),
    clearDeviceLogs: async (deviceId) => {
      const success = await dataStore.clearDeviceLogs(deviceId);
      return success;
    },
    // Global settings
    updateGlobalSettings: async (updates) => {
      const updatedSettings = await dataStore.updateGlobalSettings(updates);
      await refreshStore();
      return updatedSettings;
    },
    // Backup & restore
    createBackup: () => dataStore.createBackup(),
    restoreFromBackup: async (backupJson) => {
      const success = await dataStore.restoreFromBackup(backupJson);
      if (success) {
        await refreshStore();
      }
      return success;
    }
  };

  return (
    <DataStoreContext.Provider value={contextValue}>
      {children}
    </DataStoreContext.Provider>
  );
};

// Custom hook to use the DataStore context
export const useDataStore = () => {
  const context = useContext(DataStoreContext);
  if (!context) {
    throw new Error('useDataStore must be used within a DataStoreProvider');
  }
  return context;
};

// Add default export
export default DataStoreProvider;
