import React, { useMemo } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp, UserRole } from '../../../context/AppContext';
import { useToast } from '../../../context/ToastContext';
import type { StaffMember } from '../../../data/mockData';
import { canAccess, ROLE_LABEL } from '../../../logic/access';
import { colors, radius, shadows, spacing, typography } from '../../../constants/theme';
import { Avatar } from '../../common/Avatar';
import { Badge, statusVariant } from '../../common/Badge';
import { FadeInView, PressableScale, stagger } from '../../common/Motion';
import { ROLES_CONFIG } from '../../common/RoleSwitcher';
import { ALL_MODULES } from '../modules';
import { SectionScroll } from './common';

const GROUP_ORDER: StaffMember['role'][] = ['Doctor', 'Nurse', 'Lab Technician', 'Pharmacist', 'Administrator', 'Receptionist'];

/** Which app role each staff designation signs in with. */
const APP_ROLE: Record<StaffMember['role'], UserRole> = {
  Doctor: 'doctor',
  Nurse: 'nurse',
  'Lab Technician': 'lab',
  Pharmacist: 'pharmacy',
  Administrator: 'admin',
  Receptionist: 'admin',
};

export const UsersRolesSection: React.FC = () => {
  const { staff, activeRole } = useApp();
  const { showToast } = useToast();

  const groups = useMemo(
    () =>
      GROUP_ORDER.map((role) => ({ role, members: staff.filter((s) => s.role === role) })).filter((g) => g.members.length > 0),
    [staff]
  );
  const onDuty = staff.filter((s) => s.status === 'On Duty').length;

  const call = (member: StaffMember) => {
    Linking.openURL(`tel:${member.phone.replace(/[^\d+]/g, '')}`).catch(() =>
      showToast({ type: 'warning', message: `Calling isn't available on this device. ${member.name}: ${member.phone}` })
    );
  };

  return (
    <SectionScroll>
      <FadeInView>
        <View style={styles.rbacCard}>
          <View style={styles.rbacHeader}>
            <View style={styles.rbacIcon}>
              <Ionicons name="shield-checkmark" size={18} color="#047857" />
            </View>
            <View style={styles.rbacHeaderText}>
              <Text style={styles.rbacTitle}>Role-based access control</Text>
              <Text style={styles.rbacSub}>
                {staff.length} staff • {onDuty} on duty • signed in as {ROLE_LABEL[activeRole]}
              </Text>
            </View>
          </View>
          <Text style={styles.rbacText}>
            Every account signs in with one app role. The role decides which modules open — administrators can open everything —
            and each role switch or sensitive action is written to the audit trail.
          </Text>
          <View style={styles.roleChips}>
            {ROLES_CONFIG.map((r) => {
              const count = ALL_MODULES.filter((m) => canAccess(r.id, m)).length;
              const current = r.id === activeRole;
              return (
                <View key={r.id} style={[styles.roleChip, { backgroundColor: r.bg }, current && { borderColor: r.color }]}>
                  <Ionicons name={r.icon} size={12} color={r.color} />
                  <Text style={[styles.roleChipText, { color: r.color }]}>
                    {ROLE_LABEL[r.id]} {count}/{ALL_MODULES.length}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </FadeInView>

      {groups.map((g, gi) => {
        const cfg = ROLES_CONFIG.find((r) => r.id === APP_ROLE[g.role]);
        const onDutyInGroup = g.members.filter((m) => m.status === 'On Duty').length;
        return (
          <FadeInView key={g.role} delay={stagger(gi + 1, 60)}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupTitle}>
                {g.role === 'Receptionist' ? 'Front Office' : `${g.role}s`}{' '}
                <Text style={styles.groupCount}>
                  • {g.members.length} ({onDutyInGroup} on duty)
                </Text>
              </Text>
              <Text style={[styles.appRole, { color: cfg?.color ?? colors.textSecondary }]}>App role: {ROLE_LABEL[APP_ROLE[g.role]]}</Text>
            </View>
            <View style={styles.card}>
              {g.members.map((m, i) => (
                <View key={m.id} style={[styles.memberRow, i > 0 && styles.divider]}>
                  <Avatar name={m.name} size={40} showStatus={m.status === 'On Duty'} />
                  <View style={styles.memberBody}>
                    <View style={styles.memberTop}>
                      <Text style={styles.memberName} numberOfLines={1}>
                        {m.name}
                      </Text>
                      <Badge label={m.status} variant={statusVariant(m.status)} size="sm" />
                    </View>
                    <Text style={styles.memberMeta} numberOfLines={1}>
                      {m.department}
                    </Text>
                    <View style={styles.accessRow}>
                      {m.access.map((a) => (
                        <View key={a} style={styles.accessChip}>
                          <Text style={styles.accessText}>{a}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <PressableScale
                    onPress={() => call(m)}
                    style={styles.callBtn}
                    scaleTo={0.9}
                    accessibilityRole="button"
                    accessibilityLabel={`Call ${m.name}`}
                  >
                    <Ionicons name="call" size={16} color={colors.primary} />
                  </PressableScale>
                </View>
              ))}
            </View>
          </FadeInView>
        );
      })}
    </SectionScroll>
  );
};

const styles = StyleSheet.create({
  rbacCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  rbacHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rbacIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rbacHeaderText: {
    flex: 1,
  },
  rbacTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  rbacSub: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rbacText: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    lineHeight: 17,
    marginTop: spacing.sm,
  },
  roleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.md,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
  },
  groupHeader: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  groupTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  groupCount: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.semiBold,
  },
  appRole: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semiBold,
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    ...shadows.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  memberBody: {
    flex: 1,
    minWidth: 0,
  },
  memberTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  memberName: {
    flexShrink: 1,
    fontSize: typography.fontSizes.sm + 0.5,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  memberMeta: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  accessRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  accessChip: {
    backgroundColor: colors.cardMuted,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  accessText: {
    fontSize: 10.5,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
