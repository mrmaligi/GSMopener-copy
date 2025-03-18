import React from 'react';
import { 
  StyleSheet, 
  TextInput, 
  View, 
  Text, 
  StyleProp, 
  ViewStyle,
  TextInputProps as RNTextInputProps,
  Platform,
} from 'react-native';
import { spacing, borderRadius } from '../styles/theme';
import { useTheme } from '../contexts/ThemeContext';

interface TextInputFieldProps extends RNTextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: StyleProp<ViewStyle>;
  touched?: boolean;
}

export const TextInputField: React.FC<TextInputFieldProps> = ({
  label,
  error,
  hint,
  containerStyle,
  touched = false,
  ...props
}) => {
  const { colors } = useTheme();
  const hasError = !!error && touched;

  // Create dynamic styles based on theme
  const dynamicStyles = {
    label: {
      color: colors.text.primary,
    },
    input: {
      backgroundColor: colors.surfaceVariant,
      borderColor: colors.border,
      color: colors.text.primary,
    },
    disabledInput: {
      backgroundColor: colors.surfaceVariant,
      color: colors.text.disabled,
    },
    errorInput: {
      borderColor: colors.error,
    },
    error: {
      color: colors.error,
    },
    hint: {
      color: colors.text.secondary,
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, dynamicStyles.label]}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          dynamicStyles.input,
          props.editable === false && [styles.disabledInput, dynamicStyles.disabledInput],
          hasError && [styles.errorInput, dynamicStyles.errorInput],
        ]}
        placeholderTextColor={colors.text.disabled}
        {...props}
      />
      {hasError && <Text style={[styles.error, dynamicStyles.error]}>{error}</Text>}
      {!hasError && hint && <Text style={[styles.hint, dynamicStyles.hint]}>{hint}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    width: '100%',
  },
  label: {
    marginBottom: spacing.xs,
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
    fontSize: 16,
  },
  disabledInput: {
    // Base styles without colors
  },
  errorInput: {
    // Base styles without colors
  },
  error: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  hint: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
});

// Add default export for expo-router compatibility
export default TextInputField;
