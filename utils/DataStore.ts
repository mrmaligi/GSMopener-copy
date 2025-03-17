import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple UUID generator for React Native environment
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Main interfaces for our data model
export interface User {
  id: string;
  name: string;
  phoneNumber: string;
  serialNumber: string;
  startTime?: string;
  endTime?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  success: boolean;
  category: 'relay' | 'settings' | 'user' | 'system'; // Add category to track different types of actions
}

export interface Device {
  id: string;
  name: string;
  unitNumber: string;
  password: string;
  authorizedUsers: string[]; // References to user IDs
  createdAt: string;
  updatedAt: string;
  relaySettings?: {  // Add this to match DeviceData interface
    accessControl: 'AUT' | 'ALL';
    latchTime: string;
  };
}

export interface GlobalSettings {
  adminNumber: string;
  activeDeviceId: string | null;
  completedSteps: string[];
}

interface AppData {
  devices: Device[];
  users: User[];
  logs: Record<string, LogEntry[]>; // DeviceId -> LogEntries
  globalSettings: GlobalSettings;
}

// Default initial state
const initialState: AppData = {
  devices: [],
  users: [],
  logs: {},
  globalSettings: {
    adminNumber: '',
    activeDeviceId: null,
    completedSteps: []
  }
};

class DataStore {
  private store: AppData = initialState;
  private isInitialized: boolean = false;

  // Singleton pattern
  private static instance: DataStore;
  public static getInstance(): DataStore {
    if (!DataStore.instance) {
      DataStore.instance = new DataStore();
    }
    return DataStore.instance;
  }

  private constructor() {}

  // Initialize the store by loading data from AsyncStorage
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      const storedData = await AsyncStorage.getItem('app_data');
      
      if (storedData) {
        this.store = JSON.parse(storedData);
      } else {
        // First time initialization - try to migrate legacy data
        await this.migrateLegacyData();
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize DataStore:', error);
      // Initialize with default state if loading fails
      this.store = {...initialState};
      this.isInitialized = true;
    }
  }

  // Save the entire store to AsyncStorage
  private async saveStore(): Promise<void> {
    try {
      await AsyncStorage.setItem('app_data', JSON.stringify(this.store));
    } catch (error) {
      console.error('Failed to save store:', error);
    }
  }

  // Migrate legacy data from old AsyncStorage keys
  private async migrateLegacyData(): Promise<void> {
    try {
      // Check for legacy device data
      const unitNumber = await AsyncStorage.getItem('unitNumber');
      const password = await AsyncStorage.getItem('password');
      
      if (unitNumber) {
        // Create a default device from legacy data
        const defaultDevice: Device = {
          id: generateUUID(),
          name: 'My Gate Opener',
          unitNumber: unitNumber,
          password: password || '1234',
          authorizedUsers: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        this.store.devices.push(defaultDevice);
        this.store.globalSettings.activeDeviceId = defaultDevice.id;
        
        // Migrate legacy authorized users
        const legacyUsers = await AsyncStorage.getItem('authorizedUsers');
        if (legacyUsers) {
          const parsedUsers = JSON.parse(legacyUsers);
          // Convert legacy format to new format
          for (const legacyUser of parsedUsers) {
            if (legacyUser.phone) { // Only migrate users that have data
              const newUser: User = {
                id: generateUUID(),
                name: `User ${legacyUser.serial}`,
                phoneNumber: legacyUser.phone,
                serialNumber: legacyUser.serial,
                startTime: legacyUser.startTime || undefined,
                endTime: legacyUser.endTime || undefined
              };
              this.store.users.push(newUser);
              defaultDevice.authorizedUsers.push(newUser.id);
            }
          }
        }
        
        // Migrate legacy logs
        const legacyLogs = await AsyncStorage.getItem('app_logs');
        if (legacyLogs) {
          this.store.logs[defaultDevice.id] = JSON.parse(legacyLogs);
        }
        
        // Migrate admin number
        const adminNumber = await AsyncStorage.getItem('adminNumber');
        if (adminNumber) {
          this.store.globalSettings.adminNumber = adminNumber;
        }
        
        // Migrate completed steps
        const completedSteps = await AsyncStorage.getItem('completedSteps');
        if (completedSteps) {
          this.store.globalSettings.completedSteps = JSON.parse(completedSteps);
        }
        
        await this.saveStore();
      }
    } catch (error) {
      console.error('Failed to migrate legacy data:', error);
    }
  }

  // Get the entire store data
  public getStore(): AppData {
    return {...this.store};
  }

  // DEVICE OPERATIONS
  
  // Get all devices
  public getDevices(): Device[] {
    return [...this.store.devices];
  }

  // Get a specific device by ID
  public getDeviceById(deviceId: string): Device | null {
    const device = this.store.devices.find(d => d.id === deviceId);
    return device ? {...device} : null;
  }

  // Add a new device
  public async addDevice(device: Omit<Device, 'id' | 'createdAt' | 'updatedAt'>): Promise<Device> {
    console.log('DataStore: Adding device:', device.name);
    
    const newDevice: Device = {
      ...device,
      id: generateUUID(),
      authorizedUsers: device.authorizedUsers || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.store.devices.push(newDevice);
    await this.saveStore();
    console.log(`DataStore: Device added successfully with ID: ${newDevice.id}`);
    return {...newDevice};
  }

  // Update an existing device
  public async updateDevice(deviceId: string, updates: Partial<Device>): Promise<Device | null> {
    const deviceIndex = this.store.devices.findIndex(d => d.id === deviceId);
    if (deviceIndex === -1) return null;
    
    this.store.devices[deviceIndex] = {
      ...this.store.devices[deviceIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await this.saveStore();
    return {...this.store.devices[deviceIndex]};
  }

  // Delete a device and all associated data
  public async deleteDevice(deviceId: string): Promise<boolean> {
    console.log(`DataStore: Deleting device ${deviceId}`);
    
    try {
      const initialLength = this.store.devices.length;
      
      // Log the device being deleted for debugging
      const deviceToDelete = this.store.devices.find(d => d.id === deviceId);
      if (!deviceToDelete) {
        console.log(`DataStore: Device ${deviceId} not found for deletion`);
        return false;
      }
      
      console.log(`DataStore: Found device to delete: ${deviceToDelete.name}`);
      
      // Remove device
      this.store.devices = this.store.devices.filter(d => d.id !== deviceId);
      
      // Remove device logs
      if (this.store.logs[deviceId]) {
        delete this.store.logs[deviceId];
      }
      
      // If this was the active device, clear the active device
      if (this.store.globalSettings.activeDeviceId === deviceId) {
        this.store.globalSettings.activeDeviceId = null;
        
        // If we have other devices, set the first one as active
        if (this.store.devices.length > 0) {
          this.store.globalSettings.activeDeviceId = this.store.devices[0].id;
        }
      }
      
      // Save changes
      await this.saveStore();
      
      const success = initialLength !== this.store.devices.length;
      console.log(`DataStore: Device deletion ${success ? 'successful' : 'failed'}`);
      
      return success;
    } catch (error) {
      console.error('DataStore: Error in deleteDevice:', error);
      return false;
    }
  }

  // Set active device
  public async setActiveDevice(deviceId: string | null): Promise<boolean> {
    if (deviceId && !this.store.devices.some(d => d.id === deviceId)) {
      return false;
    }
    
    this.store.globalSettings.activeDeviceId = deviceId;
    await this.saveStore();
    return true;
  }

  // USER OPERATIONS
  
  // Get all users
  public getUsers(): User[] {
    return [...this.store.users];
  }

  // Get users for a specific device
  public getDeviceUsers(deviceId: string): User[] {
    const device = this.store.devices.find(d => d.id === deviceId);
    if (!device) return [];
    
    return device.authorizedUsers
      .map(userId => this.store.users.find(u => u.id === userId))
      .filter(Boolean) as User[];
  }

  // Add a new user
  public async addUser(user: Omit<User, 'id'>): Promise<User> {
    const newUser: User = {
      ...user,
      id: generateUUID()
    };
    
    this.store.users.push(newUser);
    await this.saveStore();
    return {...newUser};
  }

  // Update an existing user
  public async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    const userIndex = this.store.users.findIndex(u => u.id === userId);
    if (userIndex === -1) return null;
    
    const updatedUser = {
      ...this.store.users[userIndex],
      ...updates,
    };
    
    this.store.users[userIndex] = updatedUser;
    await this.saveStore();
    return {...updatedUser};
  }

  // Delete user
  public async deleteUser(userId: string): Promise<boolean> {
    const initialLength = this.store.users.length;
    this.store.users = this.store.users.filter(user => user.id !== userId);
    
    // Also remove user from all device authorized lists
    this.store.devices.forEach(device => {
      device.authorizedUsers = device.authorizedUsers.filter(id => id !== userId);
    });
    
    if (initialLength !== this.store.users.length) {
      await this.saveStore();
      return true;
    }
    return false;
  }

  // AUTHORIZATION OPERATIONS
  
  // Add user to device authorized list
  public async authorizeUserForDevice(deviceId: string, userId: string): Promise<boolean> {
    const device = this.store.devices.find(d => d.id === deviceId);
    if (!device) return false;
    
    if (!device.authorizedUsers.includes(userId)) {
      device.authorizedUsers.push(userId);
      await this.saveStore();
      return true;
    }
    return false;
  }

  // Remove user from device authorized list
  public async deauthorizeUserForDevice(deviceId: string, userId: string): Promise<boolean> {
    const deviceIndex = this.store.devices.findIndex(d => d.id === deviceId);
    if (deviceIndex === -1) return false;
    
    const device = this.store.devices[deviceIndex];
    const initialLength = device.authorizedUsers.length;
    
    device.authorizedUsers = device.authorizedUsers.filter(id => id !== userId);
    
    if (initialLength !== device.authorizedUsers.length) {
      await this.saveStore();
      return true;
    }
    return false;
  }

  // LOG OPERATIONS
  
  // Add a log entry for a specific device
  public async addDeviceLog(
    deviceId: string, 
    action: string, 
    details: string, 
    success: boolean = true,
    category: 'relay' | 'settings' | 'user' | 'system' = 'system'
  ): Promise<LogEntry> {
    if (!this.store.logs[deviceId]) {
      this.store.logs[deviceId] = [];
    }
    
    const newLog: LogEntry = {
      id: generateUUID(),
      timestamp: new Date().toISOString(),
      action,
      details,
      success,
      category
    };
    
    // Add to beginning of array to show newest first
    this.store.logs[deviceId] = [newLog, ...this.store.logs[deviceId].slice(0, 199)];
    await this.saveStore();
    return newLog;
  }

  // Get logs for a specific device
  public getDeviceLogs(deviceId: string): LogEntry[] {
    return this.store.logs[deviceId] ? [...this.store.logs[deviceId]] : [];
  }

  // Clear logs for a specific device
  public async clearDeviceLogs(deviceId: string): Promise<boolean> {
    if (this.store.logs[deviceId]) {
      this.store.logs[deviceId] = [];
      await this.saveStore();
      return true;
    }
    return false;
  }

  // GLOBAL SETTINGS OPERATIONS
  
  // Get global settings
  public getGlobalSettings(): GlobalSettings {
    return {...this.store.globalSettings};
  }

  // Update global settings
  public async updateGlobalSettings(updates: Partial<GlobalSettings>): Promise<GlobalSettings> {
    this.store.globalSettings = {
      ...this.store.globalSettings,
      ...updates
    };
    
    await this.saveStore();
    return {...this.store.globalSettings};
  }

  // BACKUP & RESTORE
  
  // Create a backup of all data
  public createBackup(): string {
    return JSON.stringify(this.store);
  }

  // Restore from backup
  public async restoreFromBackup(backupJson: string): Promise<boolean> {
    try {
      const parsedData = JSON.parse(backupJson);
      
      // Basic validation
      if (!parsedData.devices || !parsedData.users || !parsedData.logs || !parsedData.globalSettings) {
        throw new Error('Invalid backup data structure');
      }
      
      this.store = parsedData;
      await this.saveStore();
      return true;
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      return false;
    }
  }
}

export default DataStore;