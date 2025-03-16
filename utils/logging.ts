import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LogEntry {
  id: string;
  action: string;
  details: string;
  success: boolean;
  timestamp: string;
  user?: string; // Who performed the action
}

// Helper function to create user-friendly action descriptions
export const formatActionDetails = (
  action: string,
  command: string,
  additionalInfo?: string
): string => {
  // Hide passwords in logs by replacing with asterisks
  const cleanCommand = command.replace(/\d{4}[A-Z]/g, '****');
  
  // Format different command types into readable descriptions
  if (command.includes('CC')) {
    return 'Opened gate/activated relay (ON)';
  } else if (command.includes('DD')) {
    return 'Closed gate/deactivated relay (OFF)';
  } else if (command.match(/\d{4}P\d{4}/)) {
    // Password change command with format "oldPwdPnewPwd"
    return 'Changed device password';
  } else if (command.includes('EE')) {
    return 'Checked device status';
  } else if (command.match(/\d{4}A\d{3}##/)) {
    // Delete authorized user: PwdAserial##
    const serial = command.match(/\d{4}A(\d{3})##/)?.[1];
    return `Removed authorized user from position ${serial || ''}`;
  } else if (command.match(/\d{4}A\d{3}#[^#]+#\d{10}#\d{10}#/)) {
    // Add user with time restrictions: PwdAserial#phone#starttime#endtime#
    const matches = command.match(/\d{4}A(\d{3})#([^#]+)#(\d{10})#(\d{10})#/);
    if (matches) {
      const [_, serial, phone, startTime, endTime] = matches;
      const startDate = formatTimeYYMMDDHHMM(startTime);
      const endDate = formatTimeYYMMDDHHMM(endTime);
      return `Added user ${phone} at position ${serial} with access from ${startDate} to ${endDate}`;
    }
  } else if (command.match(/\d{4}A\d{3}#[^#]+#/)) {
    // Add user: PwdAserial#phone#
    const matches = command.match(/\d{4}A(\d{3})#([^#]+)#/);
    if (matches) {
      const [_, serial, phone] = matches;
      return `Added user ${phone} at position ${serial}`;
    }
  } else if (command.match(/\d{4}A\d{3}#$/)) {
    // Query user: PwdAserial#
    const serial = command.match(/\d{4}A(\d{3})#$/)?.[1];
    return `Queried user at position ${serial || ''}`;
  } else if (command.match(/\d{4}AL\d{3}#\d{3}#/)) {
    // Query batch users: PwdALstart#end#
    const matches = command.match(/\d{4}AL(\d{3})#(\d{3})#/);
    if (matches) {
      const [_, start, end] = matches;
      return `Queried users from position ${start} to ${end}`;
    }
  } else if (command.includes('AUT')) {
    return 'Set relay to allow only authorized callers';
  } else if (command.includes('ALL')) {
    return 'Set relay to allow all callers';
  } else if (command.match(/\d{4}GOT\d{3}#/)) {
    // Set latch time: PwdGOTseconds#
    const seconds = command.match(/\d{4}GOT(\d{3})#/)?.[1];
    if (seconds === '000') {
      return 'Set relay to momentary mode (pulse)';
    } else if (seconds === '999') {
      return 'Set relay to toggle mode (stays ON until next call)';
    } else {
      return `Set relay to close for ${parseInt(seconds || '0', 10)} seconds`;
    }
  } else if (command.match(/\d{4}TEL[0-9+]+#/)) {
    // Register admin: PwdTELphone#
    const phone = command.match(/\d{4}TEL([0-9+]+)#/)?.[1];
    return `Registered admin number ${phone || ''}`;
  }
  
  // If we can't determine the specific action, use the additional info or default
  return additionalInfo || 'Sent command to device';
};

// Helper function to format YYMMDDHHMM time to readable format
function formatTimeYYMMDDHHMM(timeStr: string): string {
  if (timeStr.length !== 10) return timeStr;
  
  const year = '20' + timeStr.substring(0, 2);
  const month = timeStr.substring(2, 4);
  const day = timeStr.substring(4, 6);
  const hour = timeStr.substring(6, 8);
  const minute = timeStr.substring(8, 10);
  
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  const monthName = monthNames[parseInt(month, 10) - 1] || month;
  
  return `${monthName} ${parseInt(day, 10)}, ${year} ${hour}:${minute}`;
}

export const addLog = async (
  action: string, 
  details: string, 
  success: boolean = true,
  user?: string
): Promise<void> => {
  try {
    // Get existing logs
    const existingLogsString = await AsyncStorage.getItem('smsCommandLogs');
    const existingLogs: LogEntry[] = existingLogsString 
      ? JSON.parse(existingLogsString) 
      : [];
    
    // Create new log entry
    const newLog: LogEntry = {
      id: Date.now().toString(),
      action,
      details,
      success,
      timestamp: new Date().toISOString(),
      user
    };
    
    // Add new log to the start of the array
    const updatedLogs = [newLog, ...existingLogs];
    
    // Limit logs to most recent 100 entries
    const trimmedLogs = updatedLogs.slice(0, 100);
    
    // Save updated logs
    await AsyncStorage.setItem('smsCommandLogs', JSON.stringify(trimmedLogs));
  } catch (error) {
    console.error('Failed to add log:', error);
  }
};

// For better logs parsing of raw commands
export const logCommandAction = async (
  command: string,
  success: boolean = true,
  additionalDetails?: string
): Promise<void> => {
  let action = "GSM Command";
  let details = "";
  
  // Determine the action type
  if (command.includes('CC')) {
    action = "Gate Open";
    details = "Opened gate/activated relay";
  } else if (command.includes('DD')) {
    action = "Gate Close";
    details = "Closed gate/deactivated relay";
  } else if (command.includes('P') && command.length === 8) {
    action = "Password Change";
    details = "Changed device password";
  } else if (command.includes('EE')) {
    action = "Status Check";
    details = "Requested device status";
  } else if (command.includes('TEL')) {
    action = "Admin Registration";
    details = "Registered admin phone number";
  } else if (command.includes('A') && !command.includes('ALL') && !command.includes('AUT')) {
    action = "User Management";
    details = formatActionDetails(action, command);
  } else if (command.includes('AUT')) {
    action = "Access Control";
    details = "Set to authorized users only";
  } else if (command.includes('ALL')) {
    action = "Access Control";
    details = "Set to allow all callers";
  } else if (command.includes('GOT')) {
    action = "Relay Timing";
    details = formatActionDetails(action, command);
  }
  
  // If additionalDetails were provided, use them instead
  if (additionalDetails) {
    details = additionalDetails;
  }
  
  await addLog(action, details, success);
};

export const getLogs = async (): Promise<LogEntry[]> => {
  try {
    const logs = await AsyncStorage.getItem('smsCommandLogs');
    return logs ? JSON.parse(logs) : [];
  } catch (error) {
    console.error('Failed to retrieve logs:', error);
    return [];
  }
};

export const clearLogs = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem('smsCommandLogs', JSON.stringify([]));
  } catch (error) {
    console.error('Failed to clear logs:', error);
  }
};
