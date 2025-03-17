import DataStore from './DataStore';

export const debugDataStore = async () => {
  try {
    // Get DataStore singleton
    const dataStore = DataStore.getInstance();
    await dataStore.initialize();
    
    // Get store data
    const storeData = dataStore.getStore();
    
    console.log('=== DataStore Debug Info ===');
    console.log(`Devices: ${storeData.devices.length}`);
    console.log(`Users: ${storeData.users.length}`);
    console.log(`Active Device ID: ${storeData.globalSettings.activeDeviceId || 'None'}`);
    console.log(`Completed Steps: ${storeData.globalSettings.completedSteps.join(', ') || 'None'}`);
    
    // Check devices
    if (storeData.devices.length > 0) {
      console.log('\nDevice IDs:');
      storeData.devices.forEach(device => {
        console.log(`- ${device.id}: ${device.name} (${device.unitNumber})`);
      });
    }
    
    return storeData;
  } catch (error) {
    console.error('DataStore Debug Error:', error);
    return null;
  }
};
