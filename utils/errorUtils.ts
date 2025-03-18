import { Alert } from 'react-native';
import LogManager from './LogManager';

/**
 * Execute an async operation with consistent loading state management
 * and standardized error handling
 */
export async function safeExecute<T>(
  operation: () => Promise<T>,
  options: {
    setLoading?: (loading: boolean) => void;
    onSuccess?: (result: T) => void;
    onError?: (error: any) => void;
    errorTitle?: string;
    errorMessage?: string;
    showAlert?: boolean;
    logError?: boolean;
    deviceId?: string;
    logCategory?: 'system' | 'relay' | 'settings' | 'user';
    logAction?: string;
  } = {}
): Promise<T | null> {
  const {
    setLoading,
    onSuccess,
    onError,
    errorTitle = 'Error',
    errorMessage = 'An error occurred. Please try again.',
    showAlert = true,
    logError = true,
    deviceId,
    logCategory = 'system',
    logAction = 'Operation'
  } = options;

  if (setLoading) setLoading(true);
  
  try {
    const result = await operation();
    if (onSuccess) onSuccess(result);
    return result;
  } catch (error: any) {
    console.error(`Error during ${logAction}:`, error);
    
    if (onError) onError(error);
    
    if (showAlert) {
      Alert.alert(
        errorTitle,
        error?.message ? `${errorMessage}: ${error.message}` : errorMessage,
        [{ text: 'OK' }]
      );
    }
    
    if (logError) {
      await LogManager.addLog(
        logAction,
        `Error: ${error?.message || 'Unknown error'}`,
        false,
        deviceId,
        logCategory as any
      );
    }
    
    return null;
  } finally {
    if (setLoading) setLoading(false);
  }
}

export default {
  safeExecute
};
