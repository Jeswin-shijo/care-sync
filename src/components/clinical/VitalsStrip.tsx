import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { VitalsRecord } from '../../data/mockData';
import { vitalsFlags, VitalFlag } from '../../logic/clinical';
import { daysFromToday } from '../../utils/dates';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { friendlyDate } from './format';
import type { IconName } from './types';

interface VitalsStripProps {
  vitals?: VitalsRecord | null;
  /** Show "Today • 06:00 AM • Nurse …" (default true). */
  showMeta?: boolean;
  /** List flagged values under the tiles (default true). */
  showFlags?: boolean;
  emptyText?: string;
  style?: StyleProp<ViewStyle>;
}

interface Tile {
  field: VitalFlag['field'];
  label: string;
  value: string;
  unit: string;
  icon: IconName;
}

/** Latest vitals as compact tiles; out-of-range values are tinted amber / red. */
export const VitalsStrip: React.FC<VitalsStripProps> = ({
  vitals,
  showMeta = true,
  showFlags = true,
  emptyText = 'No vitals recorded yet.',
  style,
}) => {
  if (!vitals) {
    return (
      <View style={[styles.empty, style]}>
        <Ionicons name="pulse-outline" size={18} color={colors.textMuted} />
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    );
  }
  const flags = vitalsFlags(vitals);
  const flagFor = (field: VitalFlag['field']) => flags.find((f) => f.field === field);
  const tiles: Tile[] = [
    { field: 'bp', label: 'BP', value: vitals.bp, unit: 'mmHg', icon: 'heart-outline' },
    { field: 'pulse', label: 'Pulse', value: String(vitals.pulse), unit: 'bpm', icon: 'pulse-outline' },
    { field: 'spo2', label: 'SpO₂', value: String(vitals.spo2), unit: '%', icon: 'water-outline' },
    { field: 'temp', label: 'Temp', value: String(vitals.temp), unit: '°F', icon: 'thermometer-outline' },
  ];
  if (typeof vitals.respRate === 'number') tiles.push({ field: 'respRate', label: 'Resp. rate', value: String(vitals.respRate), unit: '/min', icon: 'cloud-outline' });
  if (typeof vitals.sugar === 'number') tiles.push({ field: 'sugar', label: 'Glucose', value: String(vitals.sugar), unit: 'mg/dL', icon: 'flask-outline' });
  const ageDays = -daysFromToday(vitals.date);

  return (
    <View style={style}>
      <View style={styles.grid}>
        {tiles.map((t) => {
          const flag = flagFor(t.field);
          const tone = flag?.severity === 'critical' ? 'critical' : flag ? 'warning' : null;
          return (
            <View
              key={t.field}
              style={[styles.tile, tone === 'warning' && styles.tileWarn, tone === 'critical' && styles.tileCrit]}
              accessibilityLabel={`${t.label} ${t.value} ${t.unit}${flag ? `, ${flag.severity}` : ''}`}
            >
              <View style={styles.tileHead}>
                <Ionicons
                  name={t.icon}
                  size={13}
                  color={tone === 'critical' ? colors.danger : tone === 'warning' ? colors.warning : colors.textMuted}
                />
                <Text style={styles.tileLabel} numberOfLines={1}>
                  {t.label}
                </Text>
              </View>
              <Text
                style={[styles.tileValue, tone === 'critical' && { color: colors.dangerText }, tone === 'warning' && { color: colors.warningText }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {t.value}
                <Text style={styles.tileUnit}> {t.unit}</Text>
              </Text>
            </View>
          );
        })}
      </View>
      {showFlags && flags.length > 0 && (
        <View style={styles.flags}>
          {flags.map((f) => (
            <View key={f.field} style={[styles.flag, f.severity === 'critical' ? styles.flagCrit : styles.flagWarn]}>
              <Ionicons name={f.severity === 'critical' ? 'alert-circle' : 'warning'} size={12} color={f.severity === 'critical' ? colors.danger : colors.warning} />
              <Text style={[styles.flagText, { color: f.severity === 'critical' ? colors.dangerText : colors.warningText }]}>{f.label}</Text>
            </View>
          ))}
        </View>
      )}
      {showMeta && (
        <View style={styles.meta}>
          <Ionicons name="time-outline" size={12} color={ageDays > 7 ? colors.warning : colors.textMuted} />
          <Text style={[styles.metaText, ageDays > 7 && { color: colors.warningText }]} numberOfLines={1}>
            {friendlyDate(vitals.date)} • {vitals.time} • {vitals.recordedBy}
            {ageDays > 7 ? ' — recheck, reading is old' : ''}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 92,
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tileWarn: { backgroundColor: colors.warningLight, borderColor: colors.warning + '55' },
  tileCrit: { backgroundColor: colors.dangerLight, borderColor: colors.danger + '55' },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tileLabel: {
    fontSize: 10.5,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tileValue: {
    fontSize: typography.fontSizes.md + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: 3,
  },
  tileUnit: {
    fontSize: 10.5,
    fontWeight: typography.fontWeights.medium,
    color: colors.textMuted,
  },
  flags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  flag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  flagWarn: { backgroundColor: colors.warningLight, borderColor: colors.warning + '40' },
  flagCrit: { backgroundColor: colors.dangerLight, borderColor: colors.danger + '40' },
  flagText: { fontSize: 11, fontWeight: typography.fontWeights.semiBold },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.sm },
  metaText: { flex: 1, fontSize: typography.fontSizes.xs, color: colors.textMuted },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  emptyText: { fontSize: typography.fontSizes.sm, color: colors.textSecondary },
});
