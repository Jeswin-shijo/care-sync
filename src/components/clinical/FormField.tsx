import React, { forwardRef, useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { FadeInView } from '../common/Motion';

interface FormFieldProps {
  label: string;
  required?: boolean;
  /** Red helper text under the field. */
  error?: string | null;
  /** Neutral / positive helper text (hidden while an error shows). */
  hint?: string | null;
  hintTone?: 'muted' | 'success' | 'warning';
  /** Optional element on the right of the label row (e.g. a counter or link). */
  labelRight?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Label + control + inline validation message. */
export const FormField: React.FC<FormFieldProps> = ({
  label,
  required,
  error,
  hint,
  hintTone = 'muted',
  labelRight,
  children,
  style,
}) => (
  <View style={[styles.field, style]}>
    <View style={styles.labelRow}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {labelRight}
    </View>
    {children}
    {error ? (
      <FadeInView key={error} offset={4} duration={220}>
        <View style={styles.msgRow} accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle" size={13} color={colors.danger} />
          <Text style={styles.error}>{error}</Text>
        </View>
      </FadeInView>
    ) : hint ? (
      <View style={styles.msgRow}>
        {hintTone === 'success' && <Ionicons name="checkmark-circle" size={13} color={colors.success} />}
        {hintTone === 'warning' && <Ionicons name="warning" size={13} color={colors.warning} />}
        <Text
          style={[
            styles.hint,
            hintTone === 'success' && { color: colors.successText },
            hintTone === 'warning' && { color: colors.warningText },
          ]}
        >
          {hint}
        </Text>
      </View>
    ) : null}
  </View>
);

export interface FieldInputProps extends TextInputProps {
  invalid?: boolean;
  left?: React.ReactNode;
  right?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

/** Bordered text input with focus / error states and optional adornments. */
export const FieldInput = forwardRef<TextInput, FieldInputProps>(
  ({ invalid, left, right, containerStyle, style, multiline, onFocus, onBlur, ...rest }, ref) => {
    const [focused, setFocused] = useState(false);
    const inner = React.useRef<TextInput | null>(null);
    const setRefs = (node: TextInput | null) => {
      inner.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    };
    return (
      <Pressable
        onPress={() => inner.current?.focus()}
        accessible={false}
        style={[
          styles.inputWrap,
          multiline && styles.inputWrapMultiline,
          focused && styles.inputFocused,
          invalid && styles.inputInvalid,
          containerStyle,
        ]}
      >
        {left}
        <TextInput
          ref={setRefs}
          placeholderTextColor={colors.textMuted}
          multiline={multiline}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, multiline && styles.inputMultiline, style]}
          {...rest}
        />
        {right}
      </Pressable>
    );
  }
);
FieldInput.displayName = 'FieldInput';

const styles = StyleSheet.create({
  field: { marginBottom: spacing.base },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: spacing.sm,
  },
  label: {
    fontSize: typography.fontSizes.sm - 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  required: { color: colors.danger },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginTop: 6,
  },
  error: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 1,
    color: colors.danger,
    fontWeight: typography.fontWeights.medium,
    lineHeight: 16,
  },
  hint: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textMuted,
    lineHeight: 16,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  inputWrapMultiline: {
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  inputFocused: { borderColor: colors.primary },
  inputInvalid: { borderColor: colors.danger, backgroundColor: '#FFFBFB' },
  input: {
    flex: 1,
    fontSize: typography.fontSizes.sm + 1,
    color: colors.text,
    paddingVertical: 10,
  },
  inputMultiline: {
    minHeight: 84,
    textAlignVertical: 'top',
    paddingTop: 4,
  },
});
