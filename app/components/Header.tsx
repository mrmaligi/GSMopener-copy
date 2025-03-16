import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { colors, shadows, spacing } from '../styles/theme';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  backTo?: string;
  rightAction?: React.ReactNode;
  showLogo?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  backTo = '',
  rightAction,
  showLogo = true,
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (backTo) {
      router.push(backTo);
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {showBack ? (
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
      
      <View style={styles.titleContainer}>
        {showLogo && (
          <Image 
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        )}
        <Text style={styles.title}>{title}</Text>
      </View>
      
      {rightAction || <View style={styles.placeholder} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingTop: 50, // For iOS status bar
    paddingBottom: 12,
    paddingHorizontal: 16,
    ...shadows.sm,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 20,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40, // To balance the header and center the title
  },
  logo: {
    width: 24,
    height: 24,
    marginRight: spacing.xs,
  },
  rightAction: {
    width: 40,
    alignItems: 'flex-end',
  },
});