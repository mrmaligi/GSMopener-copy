import React from 'react';
import { Svg, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { mapIoniconName } from '../utils/iconMapping';

interface IconProps {
  color?: string;
  size?: number;
  strokeWidth?: number;
}

export function Gate({ color = 'currentColor', size = 24, strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 21V7h18v14" />
      <Path d="M21 11H3" />
      <Path d="M7 11v10" />
      <Path d="M17 11v10" />
      <Path d="M11 11v6" />
      <Path d="M13 11v6" />
      <Path d="M12 3v4" />
      <Path d="M10 5h4" />
    </Svg>
  );
}

interface CustomIconProps {
  name: string;
  size?: number;
  color?: string;
}

// A wrapper around Ionicons with name mapping
export function CustomIcon({ name, size = 24, color = 'black' }: CustomIconProps) {
  const mappedName = mapIoniconName(name);
  return <Ionicons name={mappedName as any} size={size} color={color} />;
}

// Export as default for expo-router compatibility
export default CustomIcon;