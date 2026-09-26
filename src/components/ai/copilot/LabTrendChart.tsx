import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LabTrend } from '../../../logic/clinical';
import { colors, radius, spacing, typography } from '../../../constants/theme';
import { GrowColumn } from '../../common/Motion';
import { formatDayMonth } from '../../../utils/dates';
import { compactValue } from '../copilotEngine';

interface LabTrendChartProps {
  trend: LabTrend;
  reference?: { low?: number; high?: number };
  delay?: number;
}

const PLOT_H = 56;

const signed = (d: number) => {
  const abs = Math.abs(d);
  const v = abs >= 1000 ? compactValue(abs) : String(Math.round(abs * 100) / 100);
  return `${d > 0 ? '+' : d < 0 ? '−' : '±'}${v}`;
};
const COL_W = 18;
const SLOT_W = 34;

/**
 * "Compare with previous" for one parameter: every value as text (the table
 * twin), plus a tiny column chart that emphasises the latest result — older
 * columns are muted, the latest carries its status colour, labelled on its cap.
 */
export const LabTrendChart: React.FC<LabTrendChartProps> = ({ trend, reference, delay = 0 }) => {
  const points = trend.points.slice(-5);
  const last = points[points.length - 1];
  const prev = points.length > 1 ? points[points.length - 2] : undefined;
  const anyHigh = points.some((p) => p.flag === 'H');
  const anyLow = points.some((p) => p.flag === 'L');
  const refValue = anyHigh ? reference?.high : anyLow ? reference?.low : undefined;
  const max = Math.max(...points.map((p) => p.value), refValue ?? 0) * 1.18 || 1;
  const delta = trend.delta ?? 0;
  const improving =
    !trend.worsening && !!prev && ((!!prev.flag && !last.flag) || (last.flag === 'H' && delta < 0) || (last.flag === 'L' && delta > 0));
  const status = trend.worsening
    ? { label: 'Worsening', color: colors.danger, bg: colors.dangerLight }
    : improving
      ? { label: 'Improving', color: colors.success, bg: colors.successLight }
      : { label: 'Stable', color: colors.textSecondary, bg: colors.cardMuted };
  const statusIcon = delta > 0 ? 'trending-up' : delta < 0 ? 'trending-down' : 'remove';
  const latestColor = trend.worsening ? colors.danger : last.flag ? colors.warning : colors.success;
  const refText = reference
    ? typeof reference.low === 'number' && typeof reference.high === 'number'
      ? `Ref ${compactValue(reference.low)}–${compactValue(reference.high)}`
      : typeof reference.high === 'number'
        ? `Ref < ${compactValue(reference.high)}`
        : typeof reference.low === 'number'
          ? `Ref > ${compactValue(reference.low)}`
          : null
    : null;

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${trend.parameter} trend: ${points.map((p) => `${p.value} on ${formatDayMonth(p.date)}`).join(', ')}. ${status.label}.`}
    >
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {trend.parameter} <Text style={styles.unit}>({trend.unit})</Text>
        </Text>
        <Text style={styles.values} numberOfLines={1}>
          {points.map((p) => compactValue(p.value)).join(' → ')}
        </Text>
        {prev && (
          <Text style={styles.delta} numberOfLines={1}>
            {delta > 0 ? '▲' : delta < 0 ? '▼' : '='} {signed(delta)} since {formatDayMonth(prev.date)}
          </Text>
        )}
        <View style={styles.statusRow}>
          <View style={[styles.status, { backgroundColor: status.bg }]}>
            <Ionicons name={statusIcon} size={11} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
          {!!refText && <Text style={styles.ref}>{refText}</Text>}
        </View>
      </View>

      <View style={[styles.chart, { width: points.length * SLOT_W }]}>
        <View style={styles.plot}>
          {typeof refValue === 'number' && <View style={[styles.refLine, { bottom: (refValue / max) * PLOT_H }]} />}
          {points.map((p, i) => {
            const isLast = i === points.length - 1;
            const fraction = p.value / max;
            return (
              <View key={`${p.date}-${i}`} style={styles.slot}>
                {isLast && (
                  <Text style={[styles.cap, { bottom: fraction * PLOT_H + 2 }]} numberOfLines={1}>
                    {compactValue(p.value)}
                  </Text>
                )}
                <GrowColumn
                  fraction={fraction}
                  height={PLOT_H}
                  color={isLast ? latestColor : '#CBD5E1'}
                  delay={delay + i * 90}
                  style={{ width: COL_W }}
                />
              </View>
            );
          })}
        </View>
        <View style={styles.axis} />
        <View style={styles.dates}>
          {points.map((p, i) => (
            <Text key={`d-${p.date}-${i}`} style={styles.date} numberOfLines={1}>
              {formatDayMonth(p.date)}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  text: {
    flex: 1,
    minWidth: 0,
    paddingBottom: 14,
  },
  name: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  unit: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.regular,
    color: colors.textMuted,
  },
  values: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  delta: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 5,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
  },
  ref: {
    fontSize: 10,
    color: colors.textMuted,
  },
  chart: {
    alignItems: 'stretch',
  },
  plot: {
    height: PLOT_H + 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  refLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#FCA5A5',
  },
  slot: {
    width: SLOT_W,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  cap: {
    position: 'absolute',
    left: -6,
    right: -6,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  axis: {
    height: 1,
    backgroundColor: colors.border,
  },
  dates: {
    flexDirection: 'row',
  },
  date: {
    width: SLOT_W,
    textAlign: 'center',
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 3,
  },
});
