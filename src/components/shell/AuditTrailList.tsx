import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AuditEntry } from '../../data/mockData';
import { ROLE_LABEL } from '../../logic/access';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { roleConfig } from '../common/RoleSwitcher';
import { FadeInView, stagger } from '../common/Motion';
import { relativeTime } from './time';

interface AuditTrailListProps {
  entries: AuditEntry[];
  now: number;
  limit?: number;
  /** Fade rows in one after another. */
  animate?: boolean;
}

const roleChip = (role: string) => {
  const cfg = roleConfig(role);
  if (cfg) return { label: ROLE_LABEL[cfg.id], color: cfg.color, bg: cfg.bg, icon: cfg.icon };
  return { label: role === 'system' ? 'System' : role.charAt(0).toUpperCase() + role.slice(1), color: '#475569', bg: colors.cardMuted, icon: 'hardware-chip' as const };
};

/** Who did what, when — newest first. */
export const AuditTrailList: React.FC<AuditTrailListProps> = ({ entries, now, limit = 12, animate = true }) => {
  const rows = entries.slice(0, limit);
  if (!rows.length) {
    return <Text style={styles.empty}>No activity recorded yet.</Text>;
  }
  return (
    <View>
      {rows.map((e, i) => {
        const chip = roleChip(e.role);
        const row = (
          <View style={[styles.row, i > 0 && styles.divider]} accessible accessibilityLabel={`${e.actor}, ${chip.label}: ${e.action}${e.target ? ` — ${e.target}` : ''}, ${relativeTime(e.at, now)}`}>
            <View style={[styles.icon, { backgroundColor: chip.bg }]}>
              <Ionicons name={chip.icon} size={14} color={chip.color} />
            </View>
            <View style={styles.body}>
              <View style={styles.topLine}>
                <Text style={styles.actor} numberOfLines={1}>
                  {e.actor}
                </Text>
                <View style={[styles.chip, { backgroundColor: chip.bg }]}>
                  <Text style={[styles.chipText, { color: chip.color }]}>{chip.label}</Text>
                </View>
              </View>
              <Text style={styles.action}>
                {e.action}
                {e.target ? <Text style={styles.target}> — {e.target}</Text> : null}
              </Text>
            </View>
            <Text style={styles.time}>{relativeTime(e.at, now)}</Text>
          </View>
        );
        return animate ? (
          <FadeInView key={e.id} delay={stagger(i, 40, 400)} offset={8}>
            {row}
          </FadeInView>
        ) : (
          <React.Fragment key={e.id}>{row}</React.Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 2,
    paddingVertical: spacing.sm + 2,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  actor: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    flexShrink: 1,
  },
  chip: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  chipText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
  },
  action: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
  target: {
    color: colors.text,
    fontWeight: typography.fontWeights.medium,
  },
  time: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  empty: {
    fontSize: typography.fontSizes.sm,
    color: colors.textMuted,
    paddingVertical: spacing.md,
    textAlign: 'center',
  },
});
