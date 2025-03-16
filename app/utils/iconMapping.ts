import { Platform } from 'react-native';

// This maps invalid or inconsistent icon names to valid ones
// based on the @expo/vector-icons Ionicons set
export const mapIoniconName = (name: string): string => {
  const iconMap: Record<string, string> = {
    // Common replacements for missing icons
    'unlock-outline': 'lock-open-outline',
    'clipboard-outline': 'copy-outline',
    'pulse-outline': 'pulse',
    'contacts-outline': 'people-circle-outline',
    'lock-open-outline': Platform.OS === 'ios' ? 'lock-open' : 'lock-open-outline',
    'lock-closed-outline': Platform.OS === 'ios' ? 'lock-closed' : 'lock-closed-outline',
  };

  return iconMap[name] || name;
};

export default { mapIoniconName };
