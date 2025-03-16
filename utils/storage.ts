import AsyncStorage from '@react-native-async-storage/async-storage';
import { addLog } from './logging';

/**
 * Get the stored GSM unit number
 */
export const getUnitNumber = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('unitNumber');
  } catch (error) {
    console.error('Failed to get unit number:', error);
    return null;
  }
};

/**
 * Get the stored password
 */
export const getPassword = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('password');
  } catch (error) {
    console.error('Failed to get password:', error);
    return null;
  }
};

/**
 * Log gate operation to storage
 */
export const logGateOperation = async (
  operation: 'Open' | 'Close',
  success: boolean,
  details?: string
): Promise<void> => {
  const actionDetails = details || `Gate ${operation.toLowerCase()} command sent`;
  await addLog(`Gate ${operation}`, actionDetails, success);
};
