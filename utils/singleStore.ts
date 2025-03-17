import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple UUID generator
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Define interfaces for data model
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
}

export interface Device {
  id: string;
  name: string;
  unitNumber: string;
  password: string;
  authorizedUsers: string[]; // References to user IDs in the global users array
  relaySettings?: {
    accessControl: 'AUT' | 'ALL';
    latchTime: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface GlobalSettings {
  adminNumber: string;
  activeDeviceId: string | null;
  completedSteps: string[];
}

// Main data structure
export interface SingleStoreData {
  devices: Device[];
  users: User[];
  logs: Record<string, LogEntry[]>; // DeviceId -> LogEntries
  globalSettings: GlobalSettings;
}

// Default initial state
const initialState: SingleStoreData = {
  devices: [],
  users: [],
  logs: {},
  globalSettings: {
    adminNumber: '',
    activeDeviceId: null,
    completedSteps: []
  }
};

const STORE_KEY = 'app_single_store';

// Singleton class for data management
class SingleStore {
  private static instance: SingleStore;
  private store: SingleStoreData = initialState;
  private isInitialized = false;
  private savePromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): SingleStore {
    if (!SingleStore.instance) {
      SingleStore.instance = new SingleStore();
    }
    return SingleStore.instance;
  }

  // Initialize store from AsyncStorage
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      const storeJson = await AsyncStorage.getItem(STORE_KEY);
      if (storeJson) {
        this.store = JSON.parse(storeJson);
      } else {
        // First run - try to migrate legacy data
        await this.migrateLegacyData();
      }
      this.isInitialized = true;
    } catch (error) {
      console.error('SingleStore initialization failed:', error);
      this.store = {...initialState};
      this.isInitialized = true;
    }
  }

  // Save changes to AsyncStorage with debounce
  private async saveStore(): Promise<void> {
    if (this.savePromise) {
      return this.savePromise;
    }
    
    this.savePromise = new Promise<void>(async (resolve) => {
      try {
        await AsyncStorage.setItem(STORE_KEY, JSON.stringify(this.store));
      } catch (error) {
        console.error('Failed to save single store:', error);
      } finally {
        this.savePromise = null;
        resolve();
      }
    });
    
    return this.savePromise;
  }

  // Get a copy of the entire store
  public getStore(): SingleStoreData {
    return JSON.parse(JSON.stringify(this.store));
  }

  // Utility method to handle migrations
  private async migrateLegacyData(): Promise<void> {
    // Migration logic from old storage formats
    try {
      const unitNumber = await AsyncStorage.getItem('unitNumber');
      const password = await AsyncStorage.getItem('password');
      const adminNumber = await AsyncStorage.getItem('adminNumber');
      
      if (unitNumber) {
        // Create default device
        const defaultDevice: Device = {
          id: generateUUID(),
          name: 'My Gate Opener',
          unitNumber,
          password: password || '1234',
          authorizedUsers: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        this.store.devices.push(defaultDevice);
        this.store.globalSettings.activeDeviceId = defaultDevice.id;
        
        // Set admin number if available
        if (adminNumber) {
          this.store.globalSettings.adminNumber = adminNumber;
        }
        
        // Get completed steps
        const completedStepsJson = await AsyncStorage.getItem('completedSteps');
        if (completedStepsJson) {
          this.store.globalSettings.completedSteps = JSON.parse(completedStepsJson);
        }
        
        // Migrate authorized users
        const authUsersJson = await AsyncStorage.getItem('authorizedUsers');
        if (authUsersJson) {
          const legacyUsers = JSON.parse(authUsersJson);
          for (const legacyUser of legacyUsers) {
            if (legacyUser.phone) {
              const newUser: User = {
                id: generateUUID(),
                name: `User ${legacyUser.serial}`,
                phoneNumber: legacyUser.phone,
                serialNumber: legacyUser.serial,
                startTime: legacyUser.startTime,
                endTime: legacyUser.endTime
              };
              
              this.store.users.push(newUser);
              defaultDevice.authorizedUsers.push(newUser.id);
            }
          }
        }
        
        // Migrate logs
        const logsJson = await AsyncStorage.getItem('app_logs');
        if (logsJson) {
          this.store.logs[defaultDevice.id] = JSON.parse(logsJson);
        }
        
        await this.saveStore();
      }
    } catch (error) {
      console.error('Migration failed:', error);
    }
  }

  // DEVICE OPERATIONS
  
  public getDevices(): Device[] {
    return [...this.store.devices];
  }
  
  public getDeviceById(deviceId: string): Device | null {
    const device = this.store.devices.find(d => d.id === deviceId);
    return device ? {...device} : null;
  }
  
  public async addDevice(device: Omit<Device, 'id' | 'createdAt' | 'updatedAt'>): Promise<Device> {
    const newDevice: Device = {
      ...device,
      id: generateUUID(),
      authorizedUsers: device.authorizedUsers || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.store.devices.push(newDevice);
    await this.saveStore();
    return {...newDevice};
  }
  
  // Additional methods for users, logs, etc.
  // ...
}

export default SingleStore;
