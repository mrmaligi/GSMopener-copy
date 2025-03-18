import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { shadows } from '../styles/theme';
import { useTheme } from '../contexts/ThemeContext';
import { mapIoniconName } from '../utils/iconMapping';
import { useFonts } from 'expo-font';
import { Logo } from './Logo';

interface StandardHeaderProps {
  showBack?: boolean;
  backTo?: string;
  rightAction?: {
    icon: string;
    onPress: () => void;
  } | null;
  onBackPress?: () => void;
  title?: string;
}

export const StandardHeader: React.FC<StandardHeaderProps> = ({
  showBack = false,
  backTo = '',
  rightAction,
  onBackPress,
  title
}) => {
  const router = useRouter();
  const { isDarkMode, colors } = useTheme();
  
  // Load the Neuropolitical font - updated path to correct assets/fonts location
  const [fontsLoaded] = useFonts({
    'NeuropoliticalRG': require('../../assets/fonts/neuropolitical rg.ttf'),
  });
  
  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else if (backTo) {
      router.replace(backTo);
    } else {
      router.back();
    }
  };

  return (
    <>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <View 
        style={[
          styles.container, 
          { 
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          }
        ]}
      >
        {showBack ? (
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleBack}
            accessibilityLabel="Go back"
          >
            <Ionicons 
              name={mapIoniconName("arrow-back")} 
              size={28} // Increased icon size
              color={colors.text.primary} 
            />
          </TouchableOpacity>
        ) : (
          <Logo size="medium" />
        )}

        <View style={styles.headerMiddle}>
          {(showBack && title) ? (
            <Text style={[styles.title, { color: colors.text.primary }]}>
              {title}
            </Text>
          ) : showBack && (
            <Logo size="medium" />
          )}
        </View>

        <View style={styles.rightSection}>
          {rightAction && (
            <TouchableOpacity onPress={rightAction.onPress} style={styles.rightButton}>
              <Ionicons
                name={mapIoniconName(rightAction.icon)}
                size={28} // Increased icon size
                color={colors.primary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 50, // Increased top padding
    paddingBottom: 18, // Increased bottom padding
    paddingHorizontal: 20, // Increased horizontal padding
    borderBottomWidth: 1,
    ...shadows.sm,
  },
  headerMiddle: {
    flex: 1,
    alignItems: 'center',
  },
  backButton: {
    padding: 10, // Increased padding
    marginRight: 10, // Increased margin
  },
  rightSection: {
    width: 48, // Increased width
    alignItems: 'flex-end',
  },
  rightButton: {
    padding: 10, // Added padding to the right button
  },
  title: {
    fontSize: 26, // Increased font size
    fontWeight: '600',
    marginVertical: 5, // Added vertical margin
  },
  apcTitle: {
    fontFamily: 'NeuropoliticalRG',
  },
});

export default StandardHeader;
