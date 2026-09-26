import React, { forwardRef, useState } from 'react';
import { StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../constants/theme';

interface FormFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  required?: boolean;
  /** Inline validation message (red helper text under the field). */
  error?: string | null;
  /** Muted helper text shown when there is no error. */
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Shows "12/120" when maxLength is set. */
  showCount?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

/** Labelled text input with inline validation. */
export const FormField = forwardRef<TextInput, FormFieldProps>(
  ({ label, required, error, hint, icon, showCount, containerStyle, multiline, editable = true, onFocus, onBlur, value, maxLength, ...rest }, ref) => {
    const [focused, setFocused] = useState(false);
    return (
      <View style={[styles.container, containerStyle]}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>
            {label}
            {required ? <Text style={styles.required}> *</Text> : null}
          </Text>
          {showCount && maxLength ? (
            <Text style={styles.count}>
              {(value ?? '').length}/{maxLength}
            </Text>
          ) : null}
        </View>
        <View
          style={[
            styles.inputWrap,
            multiline && styles.inputWrapMultiline,
            focused && styles.inputFocused,
            !!error && styles.inputError,
            !editable && styles.inputReadOnly,
          ]}
        >
          {icon ? <Ionicons name={icon} size={16} color={error ? colors.danger : colors.textMuted} style={multiline ? styles.iconTop : undefined} /> : null}
          <TextInput
            ref={ref}
            {...rest}
            value={value}
            maxLength={maxLength}
            editable={editable}
            multiline={multiline}
            placeholderTextColor={colors.textMuted}
            style={[styles.input, multiline && styles.inputMultiline]}
            textAlignVertical={multiline ? 'top' : 'center'}
            accessibilityLabel={rest.accessibilityLabel ?? label}
            accessibilityHint={error ?? hint}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
          />
        </View>
        {error ? (
          <View style={styles.helperRow} accessibilityLiveRegion="polite">
            <Ionicons name="alert-circle" size={13} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : hint ? (
          <Text style={styles.hintText}>{hint}</Text>
        ) : null}
      </View>
    );
  }
);

FormField.displayName = 'FormField';

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  label: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  required: {
    color: colors.danger,
  },
  count: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
  },
  inputWrapMultiline: {
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: '#FAFCFF',
  },
  inputError: {
    borderColor: colors.danger,
    backgroundColor: '#FFFBFB',
  },
  inputReadOnly: {
    backgroundColor: colors.cardMuted,
  },
  iconTop: {
    marginTop: 4,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSizes.sm + 1,
    color: colors.text,
    paddingVertical: 10,
  },
  inputMultiline: {
    minHeight: 84,
    paddingVertical: 4,
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  errorText: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.danger,
    fontWeight: typography.fontWeights.medium,
    flex: 1,
  },
  hintText: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textMuted,
    marginTop: 5,
  },
});
