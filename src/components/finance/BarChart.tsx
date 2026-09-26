import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, typography } from '../../constants/theme';
import { GrowColumn, stagger } from '../common/Motion';

export interface BarDatum {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarDatum[];
  /** Height of the tallest bar. */
  height?: number;
  barMaxWidth?: number;
  color?: string;
  highlightColor?: string;
  /** Value captions above the bars. */
  showValues?: 'max' | 'all' | 'none';
  formatValue?: (n: number) => string;
  showLabels?: boolean;
  gap?: number;
  style?: StyleProp<ViewStyle>;
  /** Spoken summary, e.g. "Revenue by hour". */
  accessibilityTitle?: string;
}

const VALUE_ROW = 16;

/** Vertical bar chart whose columns grow in with a stagger; the largest bar is highlighted. */
export const BarChart: React.FC<BarChartProps> = ({
  data,
  height = 120,
  barMaxWidth = 28,
  color = '#93C5FD',
  highlightColor = colors.primary,
  showValues = 'max',
  formatValue = (n) => String(Math.round(n)),
  showLabels = true,
  gap = 8,
  style,
  accessibilityTitle = 'Chart',
}) => {
  const max = data.reduce((m, d) => Math.max(m, d.value), 0);
  const maxIndex = max > 0 ? data.findIndex((d) => d.value === max) : -1;
  const summary = `${accessibilityTitle}: ${data.map((d) => `${d.label} ${formatValue(d.value)}`).join(', ')}`;

  return (
    <View style={style} accessible accessibilityLabel={summary}>
      <View style={[styles.bars, { gap }]}>
        {data.map((d, i) => {
          const isMax = i === maxIndex;
          const caption = showValues === 'all' || (showValues === 'max' && isMax);
          return (
            <View key={`${d.label}-${i}`} style={styles.column}>
              {showValues !== 'none' && (
                <Text style={[styles.value, isMax && { color: highlightColor }]} numberOfLines={1}>
                  {caption ? formatValue(d.value) : ' '}
                </Text>
              )}
              <GrowColumn
                fraction={max > 0 ? d.value / max : 0}
                height={height}
                color={isMax ? highlightColor : color}
                delay={stagger(i, 55)}
                style={{ width: '100%', maxWidth: barMaxWidth }}
              />
            </View>
          );
        })}
      </View>
      {showLabels && (
        <View style={[styles.labels, { gap }]}>
          {data.map((d, i) => (
            <Text key={`${d.label}-${i}`} style={[styles.label, i === maxIndex && styles.labelMax]} numberOfLines={2}>
              {d.label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  column: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    height: VALUE_ROW,
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  labels: {
    flexDirection: 'row',
    marginTop: 6,
  },
  label: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10.5,
    color: colors.textSecondary,
  },
  labelMax: {
    color: colors.text,
    fontWeight: typography.fontWeights.semiBold,
  },
});
