export interface DeviceData {
  id: string;
  name: string;
  unitNumber: string; // Phone number
  password: string;
  type: 'Connect4v' | 'Phonic4v';  // Device type
  lastConnected?: string; // ISO date string
  isActive: boolean;
  relaySettings?: {
    accessControl: 'AUT' | 'ALL';
    latchTime: string;
  };
}
