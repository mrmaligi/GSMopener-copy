import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useDataStore } from '../contexts/DataStoreContext';

export const DataStoreSyncMonitor: React.FC = () => {
  const { store, isLoading } = useDataStore();
  
  // Monitor store changes
  useEffect(() => {
    if (!isLoading) {
      console.log("DataStore Monitor: Store updated", {
        devices: store.devices.length,
        users: store.users.length,
        activeDeviceId: store.globalSettings.activeDeviceId,
        completedSteps: store.globalSettings.completedSteps
      });
    }
  }, [store, isLoading]);
  
  // Return null - this is just a monitoring component
  return null;
};

// Also export as default for compatibility with React Router
export default DataStoreSyncMonitor;
