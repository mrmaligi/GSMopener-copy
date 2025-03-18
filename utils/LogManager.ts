import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGetItem, safeSetItem } from './storageUtils';

// Standardized log entry structure
export interface LogEntry {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  success: boolean;
  deviceId?: string;
  category?: 'relay' | 'settings' | 'user' | 'system';
}

// Generate a UUID for log entries
const generateLogId = (): string => {
  return 'log_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Sanitize sensitive information from logs
const sanitizeLogDetails = (command: string): string => {
  // Hide passwords (e.g., 1234P... becomes ****P...)
  if (typeof command === 'string') {
    return command.replace(/\d{4}([A-Z])/g, '****$1');
  }
  return command;
};

/**
 * Unified Log Management class
 * Single source of truth for all logging operations
 */
export class LogManager {
  // Constants for storage keys
  private static readonly LEGACY_LOGS_KEY = 'smsCommandLogs';
  private static readonly SYSTEM_LOGS_KEY = 'systemLogs';
  
  /**
   * Get device-specific logs key
   */
  private static getDeviceLogsKey(deviceId: string): string {
    return `app_logs_${deviceId}`;
  }
  
  /**
   * Add a log entry with consistent formatting
   */
  public static async addLog(
    action: string,
    details: string,
    success: boolean = true,
    deviceId?: string,
    category: 'relay' | 'settings' | 'user' | 'system' = 'system'
  ): Promise<LogEntry> {
    // Create new log entry with standardized format
    const newLog: LogEntry = {
      id: generateLogId(),
      timestamp: new Date().toISOString(),
      action,
      details,
      success,
      deviceId,
      category
    };
    
    try {
      // Save to device-specific logs if deviceId is provided
      if (deviceId && typeof deviceId === 'string') {
        const deviceLogsKey = this.getDeviceLogsKey(deviceId);
        const logsJson = await safeGetItem(deviceLogsKey, '[]');
        const logs: LogEntry[] = logsJson ? JSON.parse(logsJson) : [];
        
        // Add to beginning of array (newest first)
        const updatedLogs = [newLog, ...logs.slice(0, 199)]; // Keep max 200 logs
        
        await safeSetItem(deviceLogsKey, JSON.stringify(updatedLogs));
      }
      
      // Always save system-level logs too
      const systemLogsJson = await safeGetItem(this.SYSTEM_LOGS_KEY, '[]');
      const systemLogs: LogEntry[] = systemLogsJson ? JSON.parse(systemLogsJson) : [];
      
      // Add to beginning of array (newest first)
      const updatedSystemLogs = [newLog, ...systemLogs.slice(0, 99)]; // Keep max 100 logs
      
      await safeSetItem(this.SYSTEM_LOGS_KEY, JSON.stringify(updatedSystemLogs));
      
      console.log('Log added:', action, sanitizeLogDetails(details), success);
      
      return newLog;
    } catch (error) {
      console.error('Error adding log:', error);
      return newLog; // Return the log entry anyway
    }
  }
  
  /**
   * Log SMS command operations with proper handling of sensitive data
   */
  public static async logSMSOperation(
    deviceId: string | undefined,
    command: string,
    success: boolean = true
  ): Promise<LogEntry> {
    let action = "GSM Command";
    let details = sanitizeLogDetails(command);
    let category: 'relay' | 'settings' | 'user' | 'system' = 'system';
    
    // Determine action and category based on command
    if (command.includes('CC')) {
      action = "Gate Open";
      details = "Opened gate/activated relay (ON)";
      category = 'relay';
    } else if (command.includes('DD')) {
      action = "Gate Close";
      details = "Closed gate/deactivated relay (OFF)";
      category = 'relay';
    } else if (command.includes('P')) {
      action = "Password Change";
      details = "Changed device password";
      category = 'settings';
    } else if (command.includes('EE')) {
      action = "Status Check";
      details = "Requested device status";
      category = 'system';
    } else if (command.includes('TEL')) {
      action = "Admin Registration";
      details = "Registered admin phone number";
      category = 'settings';
    } else if (command.includes('A') && !command.includes('ALL') && !command.includes('AUT')) {
      action = "User Management";
      category = 'user';
      
      if (command.includes('##')) {
        const serial = command.match(/\d{4}A(\d{3})##/)?.[1];
        details = `Removed authorized user from position ${serial || ''}`;
      } else if (command.match(/\d{4}A\d{3}#[^#]+#/)) {
        const matches = command.match(/\d{4}A(\d{3})#([^#]+)#/);
        if (matches) {
          const [_, serial, phone] = matches;
          details = `Added user ${phone} at position ${serial}`;
        }
      }
    } else if (command.includes('AUT')) {
      action = "Access Control";
      details = "Set to authorized users only";
      category = 'settings';
    } else if (command.includes('ALL')) {
      action = "Access Control";
      details = "Set to allow all callers";
      category = 'settings';
    } else if (command.includes('GOT')) {
      action = "Relay Timing";
      category = 'settings';
      
      const seconds = command.match(/\d{4}GOT(\d{3})#/)?.[1];
      if (seconds === '000') {
        details = 'Set relay to momentary mode (pulse)';
      } else if (seconds === '999') {
        details = 'Set relay to toggle mode (stays ON until next call)';
      } else {
        details = `Set relay to close for ${parseInt(seconds || '0', 10)} seconds`;
      }
    }
    
    return this.addLog(action, details, success, deviceId, category);
  }
  
  /**
   * Get logs for a specific device
   */
  public static async getDeviceLogs(deviceId?: string): Promise<LogEntry[]> {
    try {
      if (deviceId && typeof deviceId === 'string') {
        const deviceLogsKey = this.getDeviceLogsKey(deviceId);
        const logsJson = await safeGetItem(deviceLogsKey, '[]');
        if (logsJson) {
          return JSON.parse(logsJson);
        }
      }
      
      // Fall back to system logs
      const systemLogsJson = await safeGetItem(this.SYSTEM_LOGS_KEY, '[]');
      return systemLogsJson ? JSON.parse(systemLogsJson) : [];
    } catch (error) {
      console.error('Failed to get logs:', error);
      return [];
    }
  }
  
  /**
   * Clear logs for a specific device
   */
  public static async clearDeviceLogs(deviceId?: string): Promise<boolean> {
    try {
      if (deviceId && typeof deviceId === 'string') {
        const deviceLogsKey = this.getDeviceLogsKey(deviceId);
        await safeSetItem(deviceLogsKey, '[]');
        return true;
      }
      
      // Clear system logs if no deviceId
      await safeSetItem(this.SYSTEM_LOGS_KEY, '[]');
      return true;
    } catch (error) {
      console.error('Failed to clear logs:', error);
      return false;
    }
  }
}

export default LogManager;
