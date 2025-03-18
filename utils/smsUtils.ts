import { Platform, Linking, Alert } from 'react-native';
import LogManager from './LogManager';
import { safeExecute } from './errorUtils';

/**
 * Opens the native SMS app with pre-filled recipient and message
 * @param phoneNumber The recipient's phone number (GSM relay number)
 * @param message The pre-filled command message
 * @returns Promise that resolves to true if successful
 */
export const openSMSApp = async (phoneNumber: string, message: string): Promise<boolean> => {
  try {
    console.log(`Opening SMS app - Phone: ${phoneNumber}, Message: ${message}`);
    
    if (!phoneNumber) {
      console.error('Phone number is empty or undefined');
      Alert.alert('Error', 'GSM relay phone number is missing');
      return false;
    }
    
    // Format phone number (ensure it doesn't have spaces or special characters)
    const formattedNumber = phoneNumber.replace(/[^0-9+]/g, '');
    console.log(`Formatted phone number: ${formattedNumber}`);
    
    // Create the SMS URL with platform-specific format
    // iOS uses & while Android uses ? for body parameter
    const smsUrl = Platform.select({
      ios: `sms:${formattedNumber}&body=${encodeURIComponent(message)}`,
      android: `sms:${formattedNumber}?body=${encodeURIComponent(message)}`,
      default: `sms:${formattedNumber}?body=${encodeURIComponent(message)}`
    });
    
    console.log(`Generated URL: ${smsUrl}`);
    
    // Check if the URL can be opened
    const canOpen = await Linking.canOpenURL(smsUrl);
    console.log(`Can open URL: ${canOpen}`);
    
    if (!canOpen) {
      console.error('Cannot open SMS app with this URL:', smsUrl);
      Alert.alert('Error', 'Cannot open SMS app. Please check if you have an SMS app installed.');
      return false;
    }
    
    // Open the SMS app
    await Linking.openURL(smsUrl);
    console.log('SMS app opened successfully');
    return true;
  } catch (error) {
    console.error('Failed to open SMS app:', error);
    Alert.alert('Error', 'Failed to open SMS app. Please try again.');
    return false;
  }
};

/**
 * Send an SMS command with proper error handling and logging
 */
export const sendSMSCommand = async (
  options: {
    phoneNumber: string; 
    command: string;
    deviceId?: string;
    setLoading?: (loading: boolean) => void;
    onSuccess?: () => void;
    errorTitle?: string;
    errorMessage?: string;
  }
): Promise<boolean> => {
  const {
    phoneNumber,
    command,
    deviceId,
    setLoading,
    onSuccess,
    errorTitle = 'SMS Error',
    errorMessage = 'Failed to send SMS command'
  } = options;
  
  if (!phoneNumber) {
    Alert.alert('Error', 'Device phone number not available');
    return false;
  }

  return safeExecute(
    async () => {
      // Format the phone number based on platform
      const formattedPhoneNumber = Platform.OS === 'ios' ? 
        phoneNumber.replace('+', '') : phoneNumber;
      
      // Create the SMS URL based on platform
      const smsUrl = Platform.select({
        ios: `sms:${formattedPhoneNumber}&body=${encodeURIComponent(command)}`,
        android: `sms:${formattedPhoneNumber}?body=${encodeURIComponent(command)}`,
        default: `sms:${formattedPhoneNumber}?body=${encodeURIComponent(command)}`
      });
      
      // Check if SMS is supported on this device
      const supported = await Linking.canOpenURL(smsUrl);
      if (!supported) {
        throw new Error('SMS is not available on this device');
      }
      
      // Open the SMS app
      await Linking.openURL(smsUrl);
      
      // Log the SMS operation if we have a device ID
      if (deviceId) {
        await LogManager.logSMSOperation(deviceId, command, true);
      }
      
      return true;
    },
    {
      setLoading,
      onSuccess,
      errorTitle,
      errorMessage,
      logError: true,
      deviceId,
      logCategory: 'relay',
      logAction: 'Send SMS Command'
    }
  );
};

export default {
  sendSMSCommand
};
