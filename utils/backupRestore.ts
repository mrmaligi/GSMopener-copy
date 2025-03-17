import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

// Keys used in AsyncStorage
const BACKUP_KEYS = {
  DEVICES_STORAGE_KEY: 'gsm_devices',
  ACTIVE_DEVICE_KEY: 'active_device_id',
  LEGACY_LOGS_KEY: 'app_logs',
  LEGACY_USERS_KEY: 'authorizedUsers',
  SYSTEM_LOGS_KEY: 'systemLogs',
  SMS_COMMAND_LOGS_KEY: 'smsCommandLogs',
  SETTINGS_KEY: 'app_settings',
};

// Interface for backup data structure
interface BackupData {
  version: string;
  timestamp: string;
  data: {
    [key: string]: any;
  };
}

/**
 * Creates a backup of all app data
 * @returns The backup data as a JSON string
 */
export const createBackup = async (): Promise<string> => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    console.log('Creating backup for keys:', allKeys);
    const keyValuePairs = await AsyncStorage.multiGet(allKeys);
    
    // Create a simple backup object - direct key-value storage
    const backupData = {};
    
    keyValuePairs.forEach(([key, value]) => {
      if (value) {
        try {
          backupData[key] = JSON.parse(value);
        } catch {
          backupData[key] = value;
        }
      }
    });
    
    return JSON.stringify(backupData);
  } catch (error) {
    console.error('Backup creation error:', error);
    throw error;
  }
};

/**
 * Saves backup data to a file with today's date
 */
export const saveBackupToFile = async (): Promise<string> => {
  try {
    // Create backup data
    const backupData = await createBackup();
    
    // Generate filename with current date
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const fileName = `gsm-opener-backup-${dateStr}.json`;
    
    // Determine file path
    const filePath = `${FileSystem.documentDirectory}${fileName}`;
    
    // Write backup data to file
    await FileSystem.writeAsStringAsync(filePath, backupData);
    
    return filePath;
  } catch (error) {
    console.error('Failed to save backup to file:', error);
    throw error;
  }
};

/**
 * Share the backup file with the user
 */
export const shareBackup = async (): Promise<void> => {
  try {
    // Create and save backup file
    const backupFilePath = await saveBackupToFile();
    
    // Check if sharing is available
    const isSharingAvailable = await Sharing.isAvailableAsync();
    
    if (isSharingAvailable) {
      // Share the file
      await Sharing.shareAsync(backupFilePath, {
        mimeType: 'application/json',
        dialogTitle: 'Save GSM Opener Backup',
        UTI: 'public.json' // For iOS
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (error) {
    console.error('Failed to share backup:', error);
    throw error;
  }
};

/**
 * Restores app data from a backup file - super basic version
 */
export const restoreFromBackup = async (backupJson: string): Promise<boolean> => {
  console.log('RESTORE STARTING with content length:', backupJson?.length || 0);
  
  // ULTRA SIMPLE RESTORE APPROACH
  try {
    // Clean up and check input
    if (!backupJson || backupJson.trim().length < 2) {
      console.error('Empty backup content');
      throw new Error('Backup file is empty');
    }
    
    // Simplify - make sure we have a clean string
    const cleanJson = backupJson.trim();
    
    // Find the start of the actual JSON object if there's any prefix
    let jsonToUse = cleanJson;
    const firstBrace = cleanJson.indexOf('{');
    if (firstBrace > 0) {
      jsonToUse = cleanJson.substring(firstBrace);
      console.log(`Trimmed ${firstBrace} characters from start of file`);
    }
    
    // Extract the actual backup data
    console.log('Parsing JSON...');
    let backupData;
    try {
      backupData = JSON.parse(jsonToUse);
      console.log('Successfully parsed JSON');
    } catch (parseError) {
      console.error('Parse error:', parseError.message);
      throw new Error('Could not parse backup file - invalid JSON format');
    }
    
    // Simple object check
    if (!backupData || typeof backupData !== 'object') {
      throw new Error('Invalid backup data - not an object');
    }
    
    // Check for data property (newer format)
    let dataToRestore = backupData.data ? backupData.data : backupData;
    console.log('Found data format:', dataToRestore ? 'valid' : 'invalid');
    
    // Clear existing data
    console.log('Clearing existing data');
    const keys = await AsyncStorage.getAllKeys();
    if (keys.length > 0) {
      await AsyncStorage.multiRemove(keys);
    }
    
    // Restore data items one by one
    console.log('Starting data restoration...');
    let count = 0;
    
    // Get all entries to restore
    const entries = Object.entries(dataToRestore);
    if (entries.length === 0) {
      throw new Error('No data found in backup');
    }
    
    // Restore each item individually with appropriate error handling
    for (const [key, value] of entries) {
      try {
        if (value === null || value === undefined) continue;
        
        // Store strings directly, stringify everything else
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        await AsyncStorage.setItem(key, stringValue);
        count++;
        
        // Log first few for debugging
        if (count <= 3) {
          console.log(`Restored: ${key}`);
        }
      } catch (error) {
        console.error(`Failed to restore item [${key}]:`, error);
        // Continue with next item
      }
    }
    
    console.log(`Successfully restored ${count}/${entries.length} items`);
    
    if (count === 0) {
      throw new Error('Failed to restore any items');
    }
    
    return true;
  } catch (error) {
    console.error('RESTORE FAILED:', error.message);
    throw error;
  }
};

// Simple UUID generator for backup operations
const generateSimpleUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Pick a backup file from device storage and restore it
 */
export const pickAndRestoreBackup = async (): Promise<boolean> => {
  try {
    // Pick a JSON file
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true
    });
    
    if (result.canceled) {
      return false;
    }
    
    // Get the file URI
    const fileUri = result.assets?.[0]?.uri || (result as any).uri;
    
    if (!fileUri) {
      throw new Error('Could not retrieve file URI');
    }
    
    // Read the file content
    const fileContent = await FileSystem.readAsStringAsync(fileUri);
    
    // Restore from the backup
    return await restoreFromBackup(fileContent);
  } catch (error) {
    console.error('Failed to pick and restore backup:', error);
    throw error;
  }
};
