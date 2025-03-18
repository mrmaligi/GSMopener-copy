import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Safely validates an AsyncStorage key and provides fallback handling
 */
export const validateKey = (key: any, fallback?: string): string | null => {
  if (!key || typeof key !== 'string') {
    console.error('Invalid AsyncStorage key:', key);
    return fallback || null;
  }
  return key;
};

/**
 * Safe AsyncStorage getItem with validation
 */
export const safeGetItem = async (key: any, fallback?: string): Promise<string | null> => {
  const validKey = validateKey(key, fallback);
  if (!validKey) return null;
  
  try {
    return await AsyncStorage.getItem(validKey);
  } catch (error) {
    console.error(`Error getting item with key ${validKey}:`, error);
    return null;
  }
};

/**
 * Safe AsyncStorage setItem with validation
 */
export const safeSetItem = async (key: any, value: string, fallback?: string): Promise<boolean> => {
  const validKey = validateKey(key, fallback);
  if (!validKey) return false;
  
  try {
    await AsyncStorage.setItem(validKey, value);
    return true;
  } catch (error) {
    console.error(`Error setting item with key ${validKey}:`, error);
    return false;
  }
};

/**
 * Safe AsyncStorage removeItem with validation
 */
export const safeRemoveItem = async (key: any, fallback?: string): Promise<boolean> => {
  const validKey = validateKey(key, fallback);
  if (!validKey) return false;
  
  try {
    await AsyncStorage.removeItem(validKey);
    return true;
  } catch (error) {
    console.error(`Error removing item with key ${validKey}:`, error);
    return false;
  }
};

/**
 * Safe AsyncStorage multiRemove with validation
 */
export const safeMultiRemove = async (keys: any[]): Promise<boolean> => {
  if (!Array.isArray(keys)) {
    console.error('Invalid keys array for multiRemove:', keys);
    return false;
  }
  
  const validKeys = keys.filter(k => typeof k === 'string').map(k => k as string);
  
  if (validKeys.length === 0) return false;
  
  try {
    await AsyncStorage.multiRemove(validKeys);
    return true;
  } catch (error) {
    console.error(`Error removing multiple items:`, error);
    return false;
  }
};

export default {
  validateKey,
  safeGetItem,
  safeSetItem,
  safeRemoveItem,
  safeMultiRemove
};
