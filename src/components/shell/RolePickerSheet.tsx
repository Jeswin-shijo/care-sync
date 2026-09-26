import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp, UserRole } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { canAccess, ROLE_LABEL } from '../../logic/access';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { BottomSheet } from '../common/BottomSheet';
import { ROLES_CONFIG } from '../common/RoleSwitcher';
import { ALL_MODULES } from './modules';

interface RolePickerSheetProps {
  visible: boolean;
  onClose: () => void;
}

/** Switch the signed-in role without leaving the screen (RBAC preview). */
export const RolePickerSheet: React.FC<RolePickerSheetProps> = ({ visible, onClose }) => {
  const { activeRole, setActiveRole } = useApp();
  const { showToast } = useToast();

  const pick = (role: UserRole) => {
    onClose();
    if (role === activeRole) return;
    setActiveRole(role);
    showToast({
      type: 'info',
      title: `Switched to ${ROLE_LABEL[role]}`,
      message: 'Module access updated. The switch is recorded in the audit trail.',
    });
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Switch role" subtitle="Role-based access decides which modules you can open.">
      {ROLES_CONFIG.map((r) => {
        const count = ALL_MODULES.filter((m) => canAccess(r.id, m)).length;
        const selected = r.id === activeRole;
        return (
          <Pressable
            key={r.id}
            onPress={() => pick(r.id)}
            style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && styles.rowPressed]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`${ROLE_LABEL[r.id]}, ${r.label}, ${count} of ${ALL_MODULES.length} modules`}
          >
            <View style={[styles.icon, { backgroundColor: r.bg }]}>
              <Ionicons name={r.icon} size={18} color={r.color} />
            </View>
            <View style={styles.body}>
              <Text style={styles.title}>{ROLE_LABEL[r.id]}</Text>
              <Text style={styles.sub}>
                {r.label} • {count}/{ALL_MODULES.length} modules
              </Text>
            </View>
            <Ionicons
              name={selected ? 'radio-button-on' : 'radio-button-off'}
              size={22}
              color={selected ? colors.primary : colors.textMuted}
            />
          </Pressable>
        );
      })}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.sm,
    minHeight: 60,
  },
  rowSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F7FAFF',
  },
  rowPressed: {
    backgroundColor: colors.cardMuted,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  sub: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
