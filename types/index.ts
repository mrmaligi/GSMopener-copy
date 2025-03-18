/**
 * Unified types file for consistent data structures
 */

export interface User {
  id: string;
  name: string;
  phoneNumber: string;
  serialNumber: string;
  startTime?: string;
  endTime?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  success: boolean;
  deviceId?: string;
  category?: 'relay' | 'settings' | 'user' | 'system';
}

export interface Device {
  id: string;
  name: string;
  unitNumber: string;
  password: string;
  authorizedUsers: string[];
  createdAt: string;
  updatedAt: string;
  type: string;
  isActive?: boolean;
  relaySettings?: {
    accessControl: 'AUT' | 'ALL';
    latchTime: string;
  };
}

export interface GlobalSettings {
  adminNumber: string;
  activeDeviceId: string | null;
  completedSteps: string[];
}
