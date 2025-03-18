import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { StandardHeader } from './StandardHeader';

interface PageWithHeaderProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  backTo?: string;
  onBackPress?: () => void;
  rightAction?: {
    icon: string;
    onPress: () => void;
  } | null;
}

export const PageWithHeader: React.FC<PageWithHeaderProps> = ({
  children,
  title,
  showBack = false,
  backTo,
  onBackPress,
  rightAction
}) => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StandardHeader
        title={title}
        showBack={showBack}
        backTo={backTo}
        onBackPress={onBackPress}
        rightAction={rightAction}
      />
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
