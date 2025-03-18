import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  StyleProp, 
  ViewStyle 
} from 'react-native';
import { colors, spacing, shadows, borderRadius } from '../styles/theme';
import { useTheme } from '../contexts/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  onPress,
  style,
  elevated = false,
}) => {
  const { colors } = useTheme();

  const cardStyles = [
    styles.card,
    {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    elevated && styles.elevated,
    style,
  ];

  const CardComponent = onPress ? TouchableOpacity : View;

  return (
    <CardComponent 
      style={cardStyles} 
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {title && <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>}
      {subtitle && <Text style={[styles.subtitle, { color: colors.text.secondary }]}>{subtitle}</Text>}
      <View style={styles.content}>
        {children}
      </View>
    </CardComponent>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  elevated: {
    ...shadows.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  content: {
    // No specific styles needed, just a container for content
  },
});

// Add default export for expo-router compatibility
export default Card;
