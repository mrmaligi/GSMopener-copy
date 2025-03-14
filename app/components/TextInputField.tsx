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
import { colors, spacing, borderRadius } from '../styles/theme';

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
  const hasError = !!error && touched;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          props.editable === false && styles.disabledInput,
          hasError && styles.errorInput,
        ]}
        placeholderTextColor={colors.text.disabled}
        {...props}
      />
      {hasError && <Text style={styles.error}>{error}</Text>}
      {!hasError && hint && <Text style={styles.hint}>{hint}</Text>}
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
    color: colors.text.primary,
  },
  input: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
    fontSize: 16,
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
    fontSize: 12,
    marginTop: spacing.xs,
  },
  hint: {
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: spacing.xs,
  },
});
