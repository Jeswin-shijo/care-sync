import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing, typography } from '../../constants/theme';

type Status = 'ok' | 'warning' | 'danger';

interface CheckItemProps {
  label: string;
  description?: string;
  /** Tick box the user controls. */
  checked?: boolean;
  onToggle?: () => void;
  /** Read-only system check (vitals, bills…) shown with a status icon instead of a box. */
  status?: Status;
  actionLabel?: string;
  onAction?: () => void;
  invalid?: boolean;
  style?: StyleProp<ViewStyle>;
}

const STATUS_ICON: Record<Status, { name: 'checkmark-circle' | 'warning' | 'alert-circle'; color: string }> = {
  ok: { name: 'checkmark-circle', color: colors.success },
  warning: { name: 'warning', color: colors.warning },
  danger: { name: 'alert-circle', color: colors.danger },
};

/** Checklist / consent row: a tickable box, or an automatic status line. */
export const CheckItem: React.FC<CheckItemProps> = ({
  label,
  description,
  checked = false,
  onToggle,
  status,
  actionLabel,
  onAction,
  invalid,
  style,
}) => {
  const auto = !onToggle && !!status;
  const content = (
    <>
      {auto ? (
        <Ionicons name={STATUS_ICON[status!].name} size={22} color={STATUS_ICON[status!].color} />
      ) : (
        <View style={[styles.box, checked && styles.boxChecked, invalid && !checked && styles.boxInvalid]}>
          {checked && <Ionicons name="checkmark" size={15} color="#FFFFFF" />}
        </View>
      )}
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {!!description && (
          <Text
            style={[
              styles.desc,
              status === 'warning' && { color: colors.warningText },
              status === 'danger' && { color: colors.dangerText },
            ]}
          >
            {description}
          </Text>
        )}
        {!!actionLabel && !!onAction && (
          <TouchableOpacity onPress={onAction} hitSlop={10} style={styles.action} accessibilityRole="button">
            <Text style={styles.actionText}>{actionLabel} ›</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  if (auto) return <View style={[styles.row, style]}>{content}</View>;
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onToggle?.();
      }}
      style={[styles.row, style]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
    >
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    minHeight: 44,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: 1,
  },
  boxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  boxInvalid: { borderColor: colors.danger },
  text: { flex: 1 },
  label: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
    lineHeight: 20,
  },
  desc: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
  action: { marginTop: 4, alignSelf: 'flex-start', borderRadius: radius.sm },
  actionText: {
    fontSize: typography.fontSizes.sm - 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
});
