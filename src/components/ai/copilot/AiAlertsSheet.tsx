import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AiAlert } from '../../../logic/clinical';
import { colors, radius, spacing, typography } from '../../../constants/theme';
import { BottomSheet } from '../../common/BottomSheet';
import { FadeInView, stagger } from '../../common/Motion';

const SEVERITY = {
  critical: { color: colors.danger, bg: colors.dangerLight, icon: 'alert-circle' as const, label: 'Critical' },
  warning: { color: '#D97706', bg: colors.warningLight, icon: 'warning' as const, label: 'Warning' },
  info: { color: colors.primary, bg: colors.primaryLight, icon: 'information-circle' as const, label: 'Info' },
};

type Filter = 'All' | AiAlert['severity'];

interface AiAlertsSheetProps {
  visible: boolean;
  onClose: () => void;
  alerts: AiAlert[];
  onOpen: (alert: AiAlert) => void;
  /** Ids of the doctor's own patients, to label "Your patient". */
  myPatientIds: string[];
}

/** Every live AI alert with its source record; tapping one opens the right patient & tab. */
export const AiAlertsSheet: React.FC<AiAlertsSheetProps> = ({ visible, onClose, alerts, onOpen, myPatientIds }) => {
  const [filter, setFilter] = useState<Filter>('All');
  useEffect(() => {
    if (visible) setFilter('All');
  }, [visible]);

  const count = (f: Filter) => (f === 'All' ? alerts.length : alerts.filter((a) => a.severity === f).length);
  const list = filter === 'All' ? alerts : alerts.filter((a) => a.severity === filter);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="AI Alerts" subtitle={`${alerts.length} flagged from live records • sorted by severity`} maxHeight={0.86}>
      <View style={styles.filters}>
        {(['All', 'critical', 'warning', 'info'] as Filter[]).map((f) => {
          const active = f === filter;
          const label = f === 'All' ? 'All' : SEVERITY[f].label;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filter, active && styles.filterActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {label} {count(f)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {!list.length && (
        <View style={styles.empty}>
          <Ionicons name="checkmark-done-circle-outline" size={28} color={colors.success} />
          <Text style={styles.emptyText}>No {filter === 'All' ? '' : `${SEVERITY[filter].label.toLowerCase()} `}alerts right now.</Text>
        </View>
      )}

      {list.map((a, i) => {
        const s = SEVERITY[a.severity];
        const mine = myPatientIds.includes(a.patientId);
        return (
          <FadeInView key={a.id} delay={stagger(i, 35)} offset={6}>
            <Pressable
              onPress={() => onOpen(a)}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.cardMuted }]}
              accessibilityRole="button"
              accessibilityLabel={`${s.label}: ${a.title} for ${a.patientName}. ${a.detail}`}
            >
              <View style={[styles.icon, { backgroundColor: s.bg }]}>
                <Ionicons name={s.icon} size={17} color={s.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.rowHead}>
                  <Text style={[styles.kind, { color: s.color }]}>{a.kind}</Text>
                  {mine && <Text style={styles.mine}>Your patient</Text>}
                </View>
                <Text style={styles.title} numberOfLines={2}>
                  {a.title} — {a.patientName}
                </Text>
                <Text style={styles.detail} numberOfLines={2}>
                  {a.detail}
                </Text>
                <View style={styles.source}>
                  <Ionicons name="document-text-outline" size={10} color={colors.primaryDark} />
                  <Text style={styles.sourceText} numberOfLines={1}>
                    {a.source}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          </FadeInView>
        );
      })}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  filter: {
    height: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  filterActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  filterText: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    borderRadius: radius.sm,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  kind: {
    fontSize: 10,
    fontWeight: typography.fontWeights.extraBold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  mine: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.purple,
  },
  title: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: 2,
  },
  detail: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    marginTop: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  sourceText: {
    flexShrink: 1,
    fontSize: 10,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.primaryDark,
  },
});
