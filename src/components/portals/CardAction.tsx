import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing, typography } from '../../constants/theme';

export type CardActionVariant = 'primary' | 'success' | 'outline' | 'ghost' | 'danger' | 'dangerOutline' | 'purple';

interface CardActionProps {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: CardActionVariant;
  loading?: boolean;
  disabled?: boolean;
  /** Stretch to fill the row. */
  grow?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const VARIANTS: Record<CardActionVariant, { bg: string; border: string; text: string }> = {
  primary: { bg: colors.primary, border: colors.primary, text: '#FFFFFF' },
  success: { bg: colors.success, border: colors.success, text: '#FFFFFF' },
  purple: { bg: '#7C3AED', border: '#7C3AED', text: '#FFFFFF' },
  outline: { bg: '#FFFFFF', border: colors.primary + '66', text: colors.primary },
  ghost: { bg: colors.cardMuted, border: colors.cardMuted, text: colors.textSecondary },
  danger: { bg: colors.danger, border: colors.danger, text: '#FFFFFF' },
  dangerOutline: { bg: '#FFFFFF', border: colors.danger + '66', text: colors.danger },
};

/** Compact in-card action button with a 44 pt effective touch target. */
export const CardAction: React.FC<CardActionProps> = ({
  label,
  onPress,
  icon,
  variant = 'primary',
  loading = false,
  disabled = false,
  grow = false,
  accessibilityLabel,
  style,
}) => {
  const v = VARIANTS[variant];
  return (
    <Pressable
      onPress={() => {
        if (disabled || loading) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      disabled={disabled || loading}
      hitSlop={{ top: 4, bottom: 4 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: v.bg, borderColor: v.border },
        grow && styles.grow,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <View style={styles.content}>
          {icon && <Ionicons name={icon} size={15} color={v.text} />}
          <Text style={[styles.text, { color: v.text }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  btn: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grow: {
    flex: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  text: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
});
