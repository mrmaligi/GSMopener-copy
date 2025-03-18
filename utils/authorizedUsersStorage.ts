import AsyncStorage from '@react-native-async-storage/async-storage';

// Legacy key for backward compatibility
const LEGACY_USERS_KEY = 'authorizedUsers';

// Generate device-specific key
const getDeviceUsersKey = (deviceId: string) => `authorizedUsers_${deviceId}`;

// Interfaces
export interface AuthorizedUser {
  serial: string;
  phone: string;
  startTime: string;
  endTime: string;
}

export interface User {
  id: string;
  name: string;
  phoneNumber: string;
  serialNumber: string;
  startTime?: string;
  endTime?: string;
}

// Get users for a specific device
export const getDeviceUsers = async (deviceId: string): Promise<AuthorizedUser[] | User[]> => {
  try {
    // Try device-specific storage
    const deviceUsersKey = getDeviceUsersKey(deviceId);
    const deviceUsersJson = await AsyncStorage.getItem(deviceUsersKey);
    
    if (deviceUsersJson) {
      return JSON.parse(deviceUsersJson);
    }
    
    // Fall back to legacy storage
    const legacyUsersJson = await AsyncStorage.getItem(LEGACY_USERS_KEY);
    return legacyUsersJson ? JSON.parse(legacyUsersJson) : [];
  } catch (error) {
    console.error('Failed to get device users:', error);
    return [];
  }
};

// Save users for a specific device
export const saveDeviceUsers = async (deviceId: string, users: AuthorizedUser[] | User[]): Promise<void> => {
  try {
    const deviceUsersKey = getDeviceUsersKey(deviceId);
    await AsyncStorage.setItem(deviceUsersKey, JSON.stringify(users));
  } catch (error) {
    console.error('Failed to save device users:', error);
    throw error;
  }
};

// Add user to a specific device
export const addDeviceUser = async (
  deviceId: string, 
  user: AuthorizedUser | User
): Promise<void> => {
  try {
    const users = await getDeviceUsers(deviceId);
    const updatedUsers = [...users, user];
    await saveDeviceUsers(deviceId, updatedUsers);
  } catch (error) {
    console.error('Failed to add device user:', error);
    throw error;
  }
};

// Remove user from a specific device
export const removeDeviceUser = async (
  deviceId: string, 
  userIdentifier: string // This could be id, serial, or any unique property
): Promise<void> => {
  try {
    const users = await getDeviceUsers(deviceId);
    
    // Filter based on the user interface type
    const updatedUsers = users.filter(user => {
      if ('id' in user) {
        return user.id !== userIdentifier;
      } else if ('serial' in user) {
        return user.serial !== userIdentifier;
      }
      return true;
    });
    
    await saveDeviceUsers(deviceId, updatedUsers);
  } catch (error) {
    console.error('Failed to remove device user:', error);
    throw error;
  }
};

// Migrate legacy users to device-specific storage
export const migrateLegacyUsers = async (deviceId: string): Promise<boolean> => {
  try {
    // Check if device-specific users already exist
    const deviceUsersKey = getDeviceUsersKey(deviceId);
    const deviceUsersJson = await AsyncStorage.getItem(deviceUsersKey);
    
    if (deviceUsersJson) {
      return false; // Already migrated
    }
    
    // Get legacy users
    const legacyUsersJson = await AsyncStorage.getItem(LEGACY_USERS_KEY);
    if (!legacyUsersJson) {
      return false; // No legacy users to migrate
    }
    
    // Save legacy users to device-specific storage
    await AsyncStorage.setItem(deviceUsersKey, legacyUsersJson);
    return true;
  } catch (error) {
    console.error('Failed to migrate legacy users:', error);
    return false;
  }
};

export default {
  getDeviceUsers,
  saveDeviceUsers,
  addDeviceUser,
  removeDeviceUser,
  migrateLegacyUsers
};
