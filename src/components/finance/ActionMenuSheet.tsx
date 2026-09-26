import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { BottomSheet } from '../common/BottomSheet';
import type { IconName } from './invoiceUtils';

export interface ActionItem {
  key: string;
  label: string;
  description?: string;
  icon: IconName;
  color?: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Keep the sheet open after the action runs (e.g. an export with a spinner). */
  keepOpen?: boolean;
}

interface ActionMenuSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  actions: ActionItem[];
  footerNote?: string;
}

/** Bottom-sheet action menu. Actions run after the sheet has closed so system sheets can present. */
export const ActionMenuSheet: React.FC<ActionMenuSheetProps> = ({ visible, onClose, title, subtitle, actions, footerNote }) => (
  <BottomSheet visible={visible} onClose={onClose} title={title} subtitle={subtitle}>
    {actions.map((a) => {
      const tint = a.color ?? colors.primary;
      return (
        <TouchableOpacity
          key={a.key}
          style={[styles.row, a.disabled && styles.disabled]}
          activeOpacity={0.7}
          disabled={a.disabled || a.loading}
          onPress={() => {
            if (a.keepOpen) {
              a.onPress();
              return;
            }
            onClose();
            setTimeout(a.onPress, 260);
          }}
          accessibilityRole="button"
          accessibilityLabel={a.label}
          accessibilityState={{ disabled: !!a.disabled, busy: !!a.loading }}
        >
          <View style={[styles.icon, { backgroundColor: tint + '16' }]}>
            {a.loading ? <ActivityIndicator size="small" color={tint} /> : <Ionicons name={a.icon} size={20} color={tint} />}
          </View>
          <View style={styles.text}>
            <Text style={styles.label}>{a.label}</Text>
            {!!a.description && (
              <Text style={styles.description} numberOfLines={2}>
                {a.description}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      );
    })}
    {!!footerNote && <Text style={styles.note}>{footerNote}</Text>}
  </BottomSheet>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 60,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  disabled: {
    opacity: 0.45,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  label: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  description: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
  },
  note: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textMuted,
    marginTop: spacing.md,
    lineHeight: 17,
  },
});
