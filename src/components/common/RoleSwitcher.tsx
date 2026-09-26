import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp, UserRole } from '../../context/AppContext';
import { PORTAL_FOR_ROLE, ROLE_LABEL } from '../../logic/access';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';
import { PressableScale, PulseDot } from './Motion';

export interface RoleConfig {
  id: UserRole;
  /** Portal name, e.g. "Doctor Copilot". */
  label: string;
  /** One-word chip label that always fits, e.g. "Doctor". */
  short: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  route: string;
}

export const ROLES_CONFIG: RoleConfig[] = [
  { id: 'doctor', label: 'Doctor Copilot', short: 'Doctor', sub: 'AI clinical copilot', icon: 'medical', color: '#1E6BFF', bg: '#EFF6FF', route: PORTAL_FOR_ROLE.doctor },
  { id: 'nurse', label: 'Nurse Portal', short: 'Nurse', sub: 'Ward, vitals & tasks', icon: 'fitness', color: '#059669', bg: '#ECFDF5', route: PORTAL_FOR_ROLE.nurse },
  { id: 'lab', label: 'Lab Portal', short: 'Lab', sub: 'Samples & AI summary', icon: 'flask', color: '#7C3AED', bg: '#F5F3FF', route: PORTAL_FOR_ROLE.lab },
  { id: 'pharmacy', label: 'Pharmacy Review', short: 'Pharmacy', sub: 'Drug safety checks', icon: 'shield-checkmark', color: '#D97706', bg: '#FFFBEB', route: PORTAL_FOR_ROLE.pharmacy },
  { id: 'admin', label: 'Admin Portal', short: 'Admin', sub: 'Hospital overview', icon: 'stats-chart', color: '#0284C7', bg: '#F0F9FF', route: PORTAL_FOR_ROLE.admin },
  { id: 'patient', label: 'Patient App', short: 'Patient', sub: 'Self-service & reminders', icon: 'person', color: '#EC4899', bg: '#FDF2F8', route: PORTAL_FOR_ROLE.patient },
];

export const roleConfig = (role: string): RoleConfig | undefined => ROLES_CONFIG.find((r) => r.id === role);

interface RoleSwitcherProps {
  onSelectRole?: (role: UserRole) => void;
  style?: StyleProp<ViewStyle>;
  /** Open the selected role's portal after switching (default true). */
  navigate?: boolean;
  title?: string;
}

/**
 * Compact MediOS AI role-portal switcher: one row of six portals that always
 * fits the screen, with the active role shown by a live dot.
 */
export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({
  onSelectRole,
  style,
  navigate = true,
  title = 'MediOS AI Portals',
}) => {
  const { activeRole, setActiveRole } = useApp();
  const active = roleConfig(activeRole) ?? ROLES_CONFIG[0];

  const handlePress = (item: RoleConfig) => {
    setActiveRole(item.id);
    onSelectRole?.(item.id);
    if (navigate) router.push(item.route as any);
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Ionicons name="sparkles" size={14} color={colors.primary} />
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <View
          style={[styles.activePill, { backgroundColor: active.bg }]}
          accessible
          accessibilityLabel={`Active role: ${ROLE_LABEL[activeRole]}`}
        >
          <PulseDot color={active.color} size={6} />
          <Text style={[styles.activePillText, { color: active.color }]}>{ROLE_LABEL[activeRole]}</Text>
        </View>
      </View>

      <View style={styles.row}>
        {ROLES_CONFIG.map((item) => {
          const isActive = item.id === activeRole;
          return (
            <PressableScale
              key={item.id}
              haptic
              scaleTo={0.92}
              style={styles.item}
              onPress={() => handlePress(item)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${item.label}${isActive ? ', current role' : ''}. ${navigate ? 'Opens portal' : 'Switches role'}`}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: item.bg },
                  isActive && { borderColor: item.color, backgroundColor: '#FFFFFF' },
                ]}
              >
                <Ionicons name={item.icon} size={18} color={item.color} />
              </View>
              <Text
                style={[styles.itemLabel, isActive && { color: item.color, fontWeight: typography.fontWeights.bold }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {item.short}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  title: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    flexShrink: 1,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    gap: 6,
    flexShrink: 0,
  },
  activePillText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  row: {
    flexDirection: 'row',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    minHeight: 60,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 4,
  },
  itemLabel: {
    fontSize: typography.fontSizes.xs - 0.5,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 1,
  },
});
