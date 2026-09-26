import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LabParameter } from '../../data/mockData';
import { formatParamValue, parameterFlag, ParamFlag } from '../../logic/clinical';
import { colors, radius, spacing, typography } from '../../constants/theme';

const LAKH = 100000;
const isCellCount = (p: Pick<LabParameter, 'unit' | 'value' | 'high'>) => p.unit === '/mcL' && (p.high ?? p.value) >= LAKH;
const fmt = (n: number) => (n >= 1000 ? n.toLocaleString('en-IN') : String(n));

/** "13.4 g/dL", "14,200 /mcL", "2.40 lakh/mcL" */
export const displayValue = (p: LabParameter) =>
  isCellCount(p) ? `${(p.value / LAKH).toFixed(2)} lakh/mcL` : `${formatParamValue(p)}${p.unit ? ` ${p.unit}` : ''}`;

/** Reference interval in the same units as displayValue. */
export const displayRef = (p: LabParameter) => {
  const scale = isCellCount(p) ? (n: number) => String(n / LAKH) : fmt;
  const suffix = isCellCount(p) ? ' lakh' : '';
  if (typeof p.low === 'number' && typeof p.high === 'number') return `${scale(p.low)}–${scale(p.high)}${suffix}`;
  if (typeof p.high === 'number') return `< ${scale(p.high)}${suffix}`;
  if (typeof p.low === 'number') return `> ${scale(p.low)}${suffix}`;
  return '—';
};

export const flagWord = (f: ParamFlag) => (f === 'H' ? 'High' : f === 'L' ? 'Low' : 'Normal');

interface ParamTableProps {
  parameters: LabParameter[];
  /** Patient-facing wording: "Normal / High / Low" markers instead of H/L. */
  friendly?: boolean;
}

/** Result table with reference ranges and out-of-range markers. */
export const ParamTable: React.FC<ParamTableProps> = ({ parameters, friendly = false }) => (
  <View style={styles.table}>
    <View style={[styles.row, styles.headRow]}>
      <Text style={[styles.head, styles.colName]}>Parameter</Text>
      <Text style={[styles.head, styles.colValue]}>Result</Text>
      <Text style={[styles.head, styles.colRef]}>{friendly ? 'Normal range' : 'Reference'}</Text>
    </View>
    {parameters.map((p, i) => {
      const flag = parameterFlag(p);
      const tone = flag ? colors.danger : colors.text;
      return (
        <View key={`${p.name}-${i}`} style={[styles.row, i < parameters.length - 1 && styles.rowDivider, flag && styles.rowFlagged]}>
          <Text style={[styles.cell, styles.colName, styles.name]} numberOfLines={2}>
            {p.name}
          </Text>
          <View style={[styles.colValue, styles.valueWrap]}>
            <Text style={[styles.cell, styles.value, { color: tone }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {displayValue(p)}
            </Text>
            {friendly ? (
              <View style={[styles.marker, flag ? styles.markerBad : styles.markerOk]}>
                <Ionicons
                  name={flag === 'H' ? 'arrow-up' : flag === 'L' ? 'arrow-down' : 'checkmark'}
                  size={10}
                  color={flag ? colors.danger : colors.success}
                />
                <Text style={[styles.markerText, { color: flag ? colors.danger : colors.successText }]}>{flagWord(flag)}</Text>
              </View>
            ) : flag ? (
              <View style={[styles.marker, styles.markerBad]}>
                <Ionicons name={flag === 'H' ? 'arrow-up' : 'arrow-down'} size={10} color={colors.danger} />
                <Text style={[styles.markerText, { color: colors.danger }]}>{flag}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.cell, styles.colRef, styles.ref]} numberOfLines={2}>
            {displayRef(p)}
          </Text>
        </View>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  table: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  headRow: {
    backgroundColor: colors.cardMuted,
    paddingVertical: 6,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowFlagged: {
    backgroundColor: '#FFF8F8',
  },
  head: {
    fontSize: typography.fontSizes.xs - 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  colName: { flex: 1.25 },
  colValue: { flex: 1.35 },
  colRef: { flex: 1, textAlign: 'right' },
  cell: {
    fontSize: typography.fontSizes.sm - 1,
  },
  name: {
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  valueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  value: {
    fontWeight: typography.fontWeights.bold,
    flexShrink: 1,
  },
  ref: {
    color: colors.textMuted,
  },
  marker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  markerOk: {
    backgroundColor: colors.successLight,
  },
  markerBad: {
    backgroundColor: colors.dangerLight,
  },
  markerText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
  },
});
