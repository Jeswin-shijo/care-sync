import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';
import { formatCompactCurrency } from '../../utils/formatters';
import { GrowColumn } from '../common/Motion';

interface RevenueChartProps {
  data: Array<{ label: string; value: number }>;
  height?: number;
  color?: string;
  highlightColor?: string;
}

/** Column chart that grows in from the baseline and highlights the best period. */
export const RevenueChart: React.FC<RevenueChartProps> = ({
  data,
  height = 132,
  color = '#BFD6FF',
  highlightColor = colors.primary,
}) => {
  const max = Math.max(1, ...data.map((d) => d.value));
  const best = data.reduce((bi, d, i) => (d.value > data[bi].value ? i : bi), 0);
  const summary = data.map((d) => `${d.label} ${formatCompactCurrency(d.value)}`).join(', ');

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`Revenue chart. ${summary}. Highest: ${data[best]?.label}.`}>
      <View style={[styles.plot, { height: height + 18 }]}>
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <View key={g} style={[styles.gridLine, { bottom: height * g }]} />
        ))}
        {data.map((d, i) => {
          const isBest = i === best && d.value > 0;
          return (
            <View key={`${d.label}-${i}`} style={styles.col}>
              <Text style={[styles.valueLabel, !isBest && styles.hidden]} numberOfLines={1}>
                {formatCompactCurrency(d.value)}
              </Text>
              <GrowColumn
                fraction={d.value / max}
                height={height}
                color={isBest ? highlightColor : color}
                delay={i * 60}
                style={styles.bar}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {data.map((d, i) => (
          <Text key={`${d.label}-${i}`} style={[styles.axisLabel, i === best && styles.axisLabelBest]} numberOfLines={1}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  plot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  col: {
    flex: 1,
    alignItems: 'stretch',
  },
  bar: {
    width: '100%',
  },
  valueLabel: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  hidden: {
    opacity: 0,
  },
  labels: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 6,
  },
  axisLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10.5,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.medium,
  },
  axisLabelBest: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
});
