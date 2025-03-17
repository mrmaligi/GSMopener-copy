import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { shadows } from '../styles/theme';
import { useTheme } from '../contexts/ThemeContext';
import { mapIoniconName } from '../utils/iconMapping';

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
              size={24} 
              color={colors.text.primary} 
            />
          </TouchableOpacity>
        ) : (
          <Text style={[styles.title, { color: colors.text.primary }]}>
            ((APC))®
          </Text>
        )}

        <View style={styles.headerMiddle}>
          {(showBack && title) ? (
            <Text style={[styles.title, { color: colors.text.primary }]}>
              {title}
            </Text>
          ) : showBack && (
            <Text style={[styles.title, { color: colors.text.primary }]}>
              ((APC))®
            </Text>
          )}
        </View>

        <View style={styles.rightSection}>
          {rightAction && (
            <TouchableOpacity onPress={rightAction.onPress}>
              <Ionicons
                name={mapIoniconName(rightAction.icon)}
                size={24}
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
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    ...shadows.sm,
  },
  headerMiddle: {
    flex: 1,
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  rightSection: {
    width: 40,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
  },
});

export default StandardHeader;
