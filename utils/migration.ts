import AsyncStorage from '@react-native-async-storage/async-storage';
import DataStore from './DataStore';

/**
 * Migrates all legacy data to the new DataStore format and
 * returns a success flag and the IDs of migrated devices
 */
export const migrateToDataStore = async (): Promise<{
  success: boolean;
  migratedDeviceIds: string[];
}> => {
  try {
    // Initialize the DataStore
    const dataStore = DataStore.getInstance();
    await dataStore.initialize();
    
    // Check if we already have devices in the store
    let storeData = dataStore.getStore(); // Changed from const to let
    if (storeData.devices.length > 0) {
      console.log('DataStore already has devices, skipping migration');
      return { 
        success: true, 
        migratedDeviceIds: storeData.devices.map(d => d.id)
      };
    }
    
    // DataStore's initialize() method already handles migration,
    // but we can double-check if it worked
    storeData = dataStore.getStore();
    
    if (storeData.devices.length > 0) {
      console.log(`Migration successful: ${storeData.devices.length} devices migrated`);
      return {
        success: true,
        migratedDeviceIds: storeData.devices.map(d => d.id)
      };
    }
    
    console.log('No legacy data found to migrate');
    return { success: true, migratedDeviceIds: [] };
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, migratedDeviceIds: [] };
  }
};

export default migrateToDataStore; // Add default export
