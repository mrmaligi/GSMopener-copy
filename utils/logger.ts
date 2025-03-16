import AsyncStorage from '@react-native-async-storage/async-storage';

// Type for log entries
interface LogEntry {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  success: boolean;
  deviceId?: string; // Add deviceId to associate logs with devices
}

// Get the device-specific logs key
const getDeviceLogsKey = (deviceId: string) => `app_logs_${deviceId}`;

// Legacy logs key
const LEGACY_LOGS_KEY = 'app_logs';

// Add a new log entry with optional device ID
export const addLog = async (
  action: string, 
  details: string, 
  success: boolean = true,
  deviceId?: string
): Promise<void> => {
  try {
    // Generate a unique ID for the log entry
    const id = Date.now().toString();
    
    // Create the log entry
    const logEntry: LogEntry = {
      id,
      timestamp: new Date().toISOString(),
      action,
      details,
      success,
      deviceId
    };
    
    // If deviceId is provided, store in device-specific logs
    if (deviceId) {
      // Get existing device logs
      const deviceLogsKey = getDeviceLogsKey(deviceId);
      const deviceLogsJson = await AsyncStorage.getItem(deviceLogsKey);
      const deviceLogs: LogEntry[] = deviceLogsJson ? JSON.parse(deviceLogsJson) : [];
      
      // Add the new log to the beginning of the array
      const updatedLogs = [logEntry, ...deviceLogs.slice(0, 199)]; // Keep max 200 logs
      
      // Save the updated logs
      await AsyncStorage.setItem(deviceLogsKey, JSON.stringify(updatedLogs));
    }
    
    // Always save to legacy logs as well for backward compatibility
    const existingLogsJson = await AsyncStorage.getItem(LEGACY_LOGS_KEY);
    const existingLogs: LogEntry[] = existingLogsJson ? JSON.parse(existingLogsJson) : [];
    
    // Add the new log to the beginning of the array
    const updatedLogs = [logEntry, ...existingLogs.slice(0, 199)]; // Keep max 200 logs
    
    // Save the updated logs
    await AsyncStorage.setItem(LEGACY_LOGS_KEY, JSON.stringify(updatedLogs));
  } catch (error) {
    console.error('Failed to add log:', error);
  }
};

// Get logs for a specific device
export const getDeviceLogs = async (deviceId?: string): Promise<LogEntry[]> => {
  try {
    if (deviceId) {
      // Get device-specific logs
      const deviceLogsKey = getDeviceLogsKey(deviceId);
      const logsJson = await AsyncStorage.getItem(deviceLogsKey);
      if (logsJson) {
        return JSON.parse(logsJson);
      }
    }
    
    // Fall back to legacy logs
    const logsJson = await AsyncStorage.getItem(LEGACY_LOGS_KEY);
    return logsJson ? JSON.parse(logsJson) : [];
  } catch (error) {
    console.error('Failed to get logs:', error);
    return [];
  }
};

// Clear logs for a specific device
export const clearDeviceLogs = async (deviceId?: string): Promise<void> => {
  try {
    if (deviceId) {
      // Clear device-specific logs
      const deviceLogsKey = getDeviceLogsKey(deviceId);
      await AsyncStorage.setItem(deviceLogsKey, JSON.stringify([]));
    } else {
      // Clear legacy logs
      await AsyncStorage.removeItem(LEGACY_LOGS_KEY);
    }
  } catch (error) {
    console.error('Failed to clear logs:', error);
  }
};

// Migrate legacy logs to device-specific storage
export const migrateLegacyLogs = async (deviceId: string): Promise<boolean> => {
  try {
    // Check if device-specific logs already exist
    const deviceLogsKey = getDeviceLogsKey(deviceId);
    const deviceLogsJson = await AsyncStorage.getItem(deviceLogsKey);
    
    if (deviceLogsJson) {
      return false; // Already migrated
    }
    
    // Get legacy logs
    const legacyLogsJson = await AsyncStorage.getItem(LEGACY_LOGS_KEY);
    if (!legacyLogsJson) {
      return false; // No legacy logs to migrate
    }
    
    // Parse legacy logs
    const legacyLogs: LogEntry[] = JSON.parse(legacyLogsJson);
    
    // Associate each log with this device and save
    const deviceLogs = legacyLogs.map(log => ({ ...log, deviceId }));
    await AsyncStorage.setItem(deviceLogsKey, JSON.stringify(deviceLogs));
    
    return true;
  } catch (error) {
    console.error('Failed to migrate legacy logs:', error);
    return false;
  }
};

// For backward compatibility, maintain the original getLogs and clearLogs functions
export const getLogs = getDeviceLogs;
export const clearLogs = clearDeviceLogs;

// Export the functions
export default {
  addLog,
  getLogs,
  getDeviceLogs,
  clearLogs,
  clearDeviceLogs,
  migrateLegacyLogs
};
