/**
 * A utility to safely perform AsyncStorage operations with error handling
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const safeAsyncStorage = {
  getItem: async (key: string | null | undefined): Promise<string | null> => {
    try {
      if (!key || typeof key !== 'string') {
        console.error('Invalid key provided to AsyncStorage.getItem:', key);
        return null;
      }
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`AsyncStorage.getItem error for key "${key}":`, error);
      return null;
    }
  },
  
  setItem: async (key: string | null | undefined, value: string | null | undefined): Promise<boolean> => {
    try {
      if (!key || typeof key !== 'string') {
        console.error('Invalid key provided to AsyncStorage.setItem:', key);
        return false;
      }
      
      if (value === undefined || value === null) {
        console.error('Invalid value provided to AsyncStorage.setItem for key:', key);
        return false;
      }
      
      await AsyncStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error(`AsyncStorage.setItem error for key "${key}":`, error);
      return false;
    }
  },
  
  removeItem: async (key: string | null | undefined): Promise<boolean> => {
    try {
      if (!key || typeof key !== 'string') {
        console.error('Invalid key provided to AsyncStorage.removeItem:', key);
        return false;
      }
      
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`AsyncStorage.removeItem error for key "${key}":`, error);
      return false;
    }
  },
  
  multiRemove: async (keys: string[] | null | undefined): Promise<boolean> => {
    try {
      if (!keys || !Array.isArray(keys)) {
        console.error('Invalid keys array provided to AsyncStorage.multiRemove:', keys);
        return false;
      }
      
      // Filter out invalid keys
      const validKeys = keys.filter(key => typeof key === 'string');
      
      if (validKeys.length === 0) {
        console.error('No valid keys found in provided array for AsyncStorage.multiRemove');
        return false;
      }
      
      await AsyncStorage.multiRemove(validKeys);
      return true;
    } catch (error) {
      console.error('AsyncStorage.multiRemove error:', error);
      return false;
    }
  }
};
