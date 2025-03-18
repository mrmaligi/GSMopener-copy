import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import DataStore from '../../utils/DataStore';
import { safeExecute } from '../../utils/errorUtils';
import LogManager from '../../utils/LogManager';
import { Device, GlobalSettings, LogEntry, User } from '../../types';

// Define context interface
interface DataStoreContextProps {
  store: {
    devices: Device[];
    users: User[];
    logs: Record<string, LogEntry[]>;
    globalSettings: GlobalSettings;
  };
  isLoading: boolean;
  refreshStore: () => Promise<void>;
  getDeviceById: (deviceId: string) => Device | undefined;
  addDevice: (device: Omit<Device, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Device>;
  updateDevice: (deviceId: string, updates: Partial<Device>) => Promise<Device | null>;
  deleteDevice: (deviceId: string) => Promise<boolean>;
  setActiveDevice: (deviceId: string) => Promise<boolean>;
  getDeviceUsers: (deviceId: string) => User[];
  addUser: (user: Omit<User, 'id'>) => Promise<User>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<User | null>;
  deleteUser: (userId: string) => Promise<boolean>;
  authorizeUserForDevice: (deviceId: string, userId: string) => Promise<boolean>;
  deauthorizeUserForDevice: (deviceId: string, userId: string) => Promise<boolean>;
  addDeviceLog: (deviceId: string, action: string, details: string, success?: boolean, category?: 'relay' | 'settings' | 'user' | 'system') => Promise<LogEntry>;
  getDeviceLogs: (deviceId: string) => Promise<LogEntry[]>;
  clearDeviceLogs: (deviceId: string) => Promise<boolean>;
  logSMSOperation: (deviceId: string, command: string, success?: boolean) => Promise<LogEntry>;
  updateGlobalSettings: (updates: Partial<GlobalSettings>) => Promise<GlobalSettings>;
}

// Create the context
const DataStoreContext = createContext<DataStoreContextProps | undefined>(undefined);

// Provider component
export const DataStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dataStore = DataStore.getInstance();
  const [store, setStore] = useState(dataStore.getStore());
  const [isLoading, setIsLoading] = useState(true);
  const isInitialized = useRef(false);
  const isRefreshing = useRef(false);

  // Initialize the datastore when the component mounts
  useEffect(() => {
    // Prevent multiple initializations
    if (isInitialized.current) return;
    
    const initializeDataStore = async () => {
      await safeExecute(
        async () => {
          await dataStore.initialize();
          setStore(dataStore.getStore());
          isInitialized.current = true;
        },
        {
          setLoading: setIsLoading,
          logAction: 'Data Store Initialization',
          showAlert: false
        }
      );
    };

    initializeDataStore();
  }, []);

  // Refresh the store data - using useCallback to prevent recreation on each render
  const refreshStore = useCallback(async (): Promise<void> => {
    // Prevent concurrent refreshes
    if (isRefreshing.current) return;
    
    isRefreshing.current = true;
    
    return safeExecute(
      async () => {
        await dataStore.initialize();
        
        // Only update state if the data actually changed
        const newStoreData = dataStore.getStore();
        const currentStoreJSON = JSON.stringify(store);
        const newStoreJSON = JSON.stringify(newStoreData);
        
        if (currentStoreJSON !== newStoreJSON) {
          setStore(newStoreData);
        }
      },
      {
        logAction: 'Data Store Refresh',
        showAlert: false,
        onSuccess: () => {
          isRefreshing.current = false;
        },
        onError: () => {
          isRefreshing.current = false;
        }
      }
    );
  }, [store]);

  // Define context value - memoize operations that don't directly depend on changing state
  const getDeviceById = useCallback((deviceId: string) => {
    return store.devices.find(d => d.id === deviceId);
  }, [store.devices]);
  
  const getDeviceUsers = useCallback((deviceId: string) => {
    return dataStore.getDeviceUsers(deviceId);
  }, []);

  // Define context value
  const contextValue: DataStoreContextProps = {
    store,
    isLoading,
    refreshStore,
    getDeviceById,
    addDevice: async (device) => {
      return safeExecute(
        () => dataStore.addDevice(device),
        {
          onSuccess: refreshStore,
          logAction: 'Add Device',
        }
      );
    },
    updateDevice: async (deviceId, updates) => {
      return safeExecute(
        () => dataStore.updateDevice(deviceId, updates),
        {
          onSuccess: refreshStore,
          logAction: 'Update Device',
        }
      );
    },
    deleteDevice: async (deviceId) => {
      return safeExecute(
        () => dataStore.deleteDevice(deviceId),
        {
          onSuccess: refreshStore,
          logAction: 'Delete Device',
        }
      );
    },
    setActiveDevice: async (deviceId) => {
      return safeExecute(
        () => dataStore.setActiveDevice(deviceId),
        {
          onSuccess: refreshStore,
          logAction: 'Set Active Device',
        }
      );
    },
    getDeviceUsers,
    addUser: async (user) => {
      return safeExecute(
        () => dataStore.addUser(user),
        {
          onSuccess: refreshStore,
          logAction: 'Add User',
        }
      );
    },
    updateUser: async (userId, updates) => {
      return safeExecute(
        () => dataStore.updateUser(userId, updates),
        {
          onSuccess: refreshStore,
          logAction: 'Update User',
        }
      );
    },
    deleteUser: async (userId) => {
      return safeExecute(
        () => dataStore.deleteUser(userId),
        {
          onSuccess: refreshStore,
          logAction: 'Delete User',
        }
      );
    },
    authorizeUserForDevice: async (deviceId, userId) => {
      return safeExecute(
        () => dataStore.authorizeUserForDevice(deviceId, userId),
        {
          onSuccess: refreshStore,
          logAction: 'Authorize User',
        }
      );
    },
    deauthorizeUserForDevice: async (deviceId, userId) => {
      return safeExecute(
        () => dataStore.deauthorizeUserForDevice(deviceId, userId),
        {
          onSuccess: refreshStore,
          logAction: 'Deauthorize User',
        }
      );
    },
    addDeviceLog: async (deviceId, action, details, success = true, category = 'system') => {
      return LogManager.addLog(action, details, success, deviceId, category);
    },
    getDeviceLogs: async (deviceId) => {
      return LogManager.getDeviceLogs(deviceId);
    },
    clearDeviceLogs: async (deviceId) => {
      return LogManager.clearDeviceLogs(deviceId);
    },
    logSMSOperation: async (deviceId, command, success = true) => {
      return LogManager.logSMSOperation(deviceId, command, success);
    },
    updateGlobalSettings: async (updates) => {
      return safeExecute(
        () => dataStore.updateGlobalSettings(updates),
        {
          onSuccess: refreshStore,
          logAction: 'Update Settings',
        }
      );
    },
  };

  return (
    <DataStoreContext.Provider value={contextValue}>
      {children}
    </DataStoreContext.Provider>
  );
};

// Custom hook for accessing DataStore
export const useDataStore = () => {
  const context = useContext(DataStoreContext);
  if (context === undefined) {
    throw new Error('useDataStore must be used within a DataStoreProvider');
  }
  return context;
};
