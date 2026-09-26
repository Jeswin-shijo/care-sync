import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, spacing, typography } from '../../../constants/theme';
import { Avatar } from '../../common/Avatar';
import { Badge, BadgeVariant, statusVariant } from '../../common/Badge';
import { FadeInView, PressableScale, stagger } from '../../common/Motion';
import type { PatientChip, TodayPatientRow } from '../copilotEngine';

/** Design colours: Review blue, Reports orange, Follow-up green; appointment states follow statusVariant. */
const CHIP_VARIANT: Record<PatientChip, BadgeVariant> = {
  Review: 'primary',
  Reports: 'warning',
  'Follow-up': 'success',
  Waiting: 'default',
  Seen: statusVariant('Completed'),
  'In consult': statusVariant('In Consultation'),
  'Not arrived': statusVariant('Not Arrived'),
};

interface TodayPatientsProps {
  rows: TodayPatientRow[];
  selectedId?: string | null;
  onSelect: (row: TodayPatientRow) => void;
  onSearchAll: () => void;
}

const COLLAPSED = 4;

/** Design: "Today's Patients" with Review / Reports / Follow-up / Waiting chips. */
export const TodayPatients = React.memo(function TodayPatients({ rows, selectedId, onSelect, onSearchAll }: TodayPatientsProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, COLLAPSED);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Today's Patients</Text>
          <Text style={styles.sub}>Your OPD list and in-patients • tap to load</Text>
        </View>
        <Pressable onPress={onSearchAll} hitSlop={8} style={styles.search} accessibilityRole="button" accessibilityLabel="Search any patient">
          <Ionicons name="search" size={15} color={colors.primary} />
          <Text style={styles.searchText}>Any patient</Text>
        </Pressable>
      </View>

      {!rows.length && <Text style={styles.empty}>No appointments or in-patients for you today.</Text>}

      {visible.map((row, i) => {
        const selected = row.patient.id === selectedId;
        return (
          <FadeInView key={row.patient.id} delay={stagger(i, 45)} offset={8}>
            <PressableScale
              style={[styles.row, selected && styles.rowSelected]}
              onPress={() => onSelect(row)}
              scaleTo={0.985}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${row.patient.name}, ${row.patient.age} years, ${row.chip}. ${row.reason}`}
            >
              <Avatar name={row.patient.name} size={38} />
              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={1}>
                    {row.patient.name}
                  </Text>
                  <Text style={styles.age}>
                    {row.patient.age}Y {row.patient.gender[0]}
                  </Text>
                </View>
                <Text style={styles.meta} numberOfLines={1}>
                  {row.meta}
                </Text>
                <Text style={styles.reason} numberOfLines={1}>
                  {row.reason}
                </Text>
              </View>
              <Badge label={row.chip} variant={CHIP_VARIANT[row.chip]} size="sm" />
              {selected && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
            </PressableScale>
          </FadeInView>
        );
      })}

      {rows.length > COLLAPSED && (
        <Pressable onPress={() => setExpanded((v) => !v)} style={styles.more} accessibilityRole="button">
          <Text style={styles.moreText}>{expanded ? 'Show less' : `Show all ${rows.length}`}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    ...shadows.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  sub: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  searchText: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  empty: {
    fontSize: typography.fontSizes.sm,
    color: colors.textMuted,
    paddingVertical: spacing.md,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    minHeight: 60,
  },
  rowSelected: {
    backgroundColor: colors.primaryLight,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  name: {
    flexShrink: 1,
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  age: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.semiBold,
  },
  meta: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  reason: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  more: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: spacing.sm,
    minHeight: 36,
  },
  moreText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
});
