import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { useFonts } from 'expo-font';
import { useTheme } from '../contexts/ThemeContext';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  showSubtitle?: boolean;
}

export function Logo({ size = 'medium', color, showSubtitle = true }: LogoProps) {
  const { colors } = useTheme();
  const textColor = color || colors.text.primary;
  
  // Load the Neuropolitical font
  const [fontsLoaded] = useFonts({
    'NeuropoliticalRG': require('../../assets/fonts/neuropolitical rg.ttf'),
  });
  
  if (!fontsLoaded) {
    return null;
  }
  
  // Adjust font sizes based on the requested size
  const fontSize = size === 'small' ? 18 : size === 'medium' ? 26 : 32;
  // Make the subtitle smaller to fit underneath APC
  const subtitleSize = size === 'small' ? 6 : size === 'medium' ? 7 : 9;
  // Make the brackets slightly larger than the APC text to properly enclose it
  const bracketSize = size === 'small' ? 22 : size === 'medium' ? 32 : 40;
  
  return (
    <View style={styles.logoContainer}>
      <Text style={[styles.brackets, { color: textColor, fontSize: bracketSize }]}>
        (((
      </Text>
      <View style={styles.textContainer}>
        <Text style={[styles.apcText, { color: textColor, fontSize }]}>
          APC
        </Text>
        {showSubtitle && (
          <Text style={[styles.subtitleText, { color: textColor, fontSize: subtitleSize }]}>
            Automation Systems
          </Text>
        )}
      </View>
      <Text style={[styles.brackets, { color: textColor, fontSize: bracketSize }]}>
        )))
      </Text>
      <Text style={[styles.trademark, { color: textColor }]}>®</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brackets: {
    fontWeight: '600',
    lineHeight: 36, // Helps with vertical alignment
  },
  apcText: {
    fontFamily: 'NeuropoliticalRG',
    lineHeight: 34, // Adjust to align vertically with brackets
  },
  subtitleText: {
    fontWeight: '500',
    marginTop: -6, // Bring it closer to the APC text
    lineHeight: 10, // Reduce line height to make it more compact
  },
  trademark: {
    fontSize: 10,
    lineHeight: 10,
    marginTop: -15, // Position the trademark symbol higher
    marginLeft: 2,
  }
});

export default Logo;
