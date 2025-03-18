import './utils/asyncStorageDebug';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Run a test that will log any issues
async function testAsyncStorage() {
  try {
    // This should work fine
    await AsyncStorage.setItem('test_key', 'test_value');
    
    // This will trigger the warning (intentionally passing undefined)
    let undefinedKey;
    await AsyncStorage.setItem(undefinedKey, 'this will fail');
  } catch (error) {
    console.error('Test error:', error);
  }
}

testAsyncStorage();

// Run this file with: npx tsx testAsyncStorage.ts
