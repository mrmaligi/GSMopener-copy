import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateKey } from './storageUtils';

// Save the original methods
const originalSetItem = AsyncStorage.setItem;
const originalGetItem = AsyncStorage.getItem;
const originalRemoveItem = AsyncStorage.removeItem;
const originalMultiRemove = AsyncStorage.multiRemove;

// Replace with debug versions that use validation
AsyncStorage.setItem = async (key, value) => {
  console.log('AsyncStorage.setItem called with key:', key);
  const validKey = validateKey(key);
  if (!validKey) {
    console.error('*** INVALID KEY in setItem:', key);
    console.trace('Stack trace for invalid key');
    return Promise.reject(new Error(`Invalid AsyncStorage key: ${key}`));
  }
  return originalSetItem.call(AsyncStorage, validKey, value);
};

AsyncStorage.getItem = async (key) => {
  console.log('AsyncStorage.getItem called with key:', key);
  const validKey = validateKey(key);
  if (!validKey) {
    console.error('*** INVALID KEY in getItem:', key);
    console.trace('Stack trace for invalid key');
    return Promise.reject(new Error(`Invalid AsyncStorage key: ${key}`));
  }
  return originalGetItem.call(AsyncStorage, validKey);
};

AsyncStorage.removeItem = async (key) => {
  console.log('AsyncStorage.removeItem called with key:', key);
  const validKey = validateKey(key);
  if (!validKey) {
    console.error('*** INVALID KEY in removeItem:', key);
    console.trace('Stack trace for invalid key');
    return Promise.reject(new Error(`Invalid AsyncStorage key: ${key}`));
  }
  return originalRemoveItem.call(AsyncStorage, validKey);
};

AsyncStorage.multiRemove = async (keys) => {
  console.log('AsyncStorage.multiRemove called with keys:', keys);
  if (!Array.isArray(keys)) {
    console.error('*** INVALID KEYS ARRAY in multiRemove:', keys);
    console.trace('Stack trace for invalid keys');
    return Promise.reject(new Error('Invalid keys array for multiRemove'));
  }
  
  const validKeys = keys.filter(key => typeof key === 'string');
  const invalidKeys = keys.filter(key => typeof key !== 'string');
  
  if (invalidKeys.length > 0) {
    console.error('*** INVALID KEYS in multiRemove:', invalidKeys);
    console.trace('Stack trace for invalid keys');
    // Continue with valid keys instead of failing
  }
  
  if (validKeys.length === 0) {
    return Promise.resolve(); // Nothing to remove
  }
  
  return originalMultiRemove.call(AsyncStorage, validKeys);
};

export default AsyncStorage;
