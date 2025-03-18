import AsyncStorage from '@react-native-async-storage/async-storage';
import { LogEntry } from '../(tabs)/logs';

// Generate a random ID for logs
const generateId = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Add a new log entry
export const addLog = async (action: string, details: string, success: boolean): Promise<void> => {
  try {
    // Create the new log entry
    const newLog: LogEntry = {
      id: generateId(),
      timestamp: Date.now(),
      action,
      details,
      success
    };
    
    // Get existing logs
    const existingLogsJson = await AsyncStorage.getItem('systemLogs');
    let logs: LogEntry[] = existingLogsJson ? JSON.parse(existingLogsJson) : [];
    
    // Add new log to the beginning
    logs = [newLog, ...logs];
    
    // If logs exceed 100 entries, remove oldest ones
    if (logs.length > 100) {
      logs = logs.slice(0, 100);
    }
    
    // Save updated logs
    await AsyncStorage.setItem('systemLogs', JSON.stringify(logs));
    
    // Log to console for debugging
    console.log('Log added:', action, details, success);
    
    return;
  } catch (error) {
    console.error('Error adding log:', error);
  }
};

// Get all logs
export const getLogs = async (): Promise<LogEntry[]> => {
  try {
    const logsJson = await AsyncStorage.getItem('systemLogs');
    if (logsJson) {
      return JSON.parse(logsJson);
    }
    return [];
  } catch (error) {
    console.error('Error retrieving logs:', error);
    return [];
  }
};

// Clear all logs
export const clearLogs = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem('systemLogs', JSON.stringify([]));
  } catch (error) {
    console.error('Error clearing logs:', error);
  }
};

// Add a log for open/close operations
export const logGateOperation = async (operation: 'Open' | 'Close', success: boolean, details?: string): Promise<void> => {
  const actionDetails = details || `Gate ${operation.toLowerCase()} command sent`;
  await addLog(`Gate ${operation}`, actionDetails, success);
};

// Export default for expo-router compatibility
export default {
  addLog,
  getLogs,
  clearLogs,
  logGateOperation
};
