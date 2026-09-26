import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';
import { AnimatedNumber, PressableScale } from './Motion';

interface StatCardProps {
  title: string;
  /** Numbers count up with AnimatedNumber (formatted by `format`); strings render as-is. */
  value: string | number;
  /** Formatter for numeric values, e.g. formatCurrency or (n) => `${Math.round(n)}%`. */
  format?: (n: number) => string;
  /** Trend chip text, e.g. "+12%" or "-4%". */
  change?: string;
  subtext?: string;
  /** Trend direction. When omitted it follows the sign of `change` ("-4%" renders red). */
  isPositive?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBgColor?: string;
  /** Makes the card tappable (spring press feedback). */
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Delay (ms) before the count-up starts, e.g. stagger(i). */
  delay?: number;
  /** Set false to render numeric values without the count-up. */
  animate?: boolean;
  /** Extra content under the value (e.g. a ProgressFill). */
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const defaultFormat = (n: number) => Math.round(n).toLocaleString('en-IN');

/** Font size that keeps long values (₹14,82,500) on one line inside a half-width card. */
const valueFontSize = (text: string) => {
  if (text.length > 11) return typography.fontSizes.md;
  if (text.length > 9) return typography.fontSizes.lg + 1;
  return typography.fontSizes.xl;
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  format = defaultFormat,
  change,
  subtext,
  isPositive,
  icon,
  iconColor = colors.primary,
  iconBgColor = colors.primaryLight,
  onPress,
  accessibilityLabel,
  delay = 0,
  animate = true,
  children,
  style,
}) => {
  const display = typeof value === 'number' ? format(value) : value;
  const fontSize = valueFontSize(display);
  const trimmedChange = change?.trim();
  const negative = isPositive === undefined ? /^[-−–]/.test(trimmedChange ?? '') : !isPositive;
  const trendColor = negative ? colors.danger : colors.success;
  const label =
    accessibilityLabel ??
    `${title}: ${display}${trimmedChange ? `, ${negative ? 'down' : 'up'} ${trimmedChange.replace(/^[+\-−–]/, '')}` : ''}${
      subtext ? `, ${subtext}` : ''
    }`;

  const body = (
    <>
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {icon && (
          <View style={[styles.iconWrapper, { backgroundColor: iconBgColor }]}>
            <Ionicons name={icon} size={16} color={iconColor} />
          </View>
        )}
      </View>

      {typeof value === 'number' && animate ? (
        <AnimatedNumber value={value} format={format} delay={delay} style={[styles.value, { fontSize }]} />
      ) : (
        <Text style={[styles.value, { fontSize }]} numberOfLines={1}>
          {display}
        </Text>
      )}

      {children}

      {(!!trimmedChange || !!subtext) && (
        <View style={styles.bottomRow}>
          {!!trimmedChange && (
            <View style={[styles.changeBadge, { backgroundColor: negative ? colors.dangerLight : colors.successLight }]}>
              <Ionicons name={negative ? 'arrow-down' : 'arrow-up'} size={11} color={trendColor} />
              <Text style={[styles.changeText, { color: trendColor }]}>{trimmedChange}</Text>
            </View>
          )}
          {!!subtext && <Text style={styles.subtext}>{subtext}</Text>}
        </View>
      )}
    </>
  );

  if (onPress) {
    return (
      <PressableScale
        onPress={onPress}
        style={[styles.container, style]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        {body}
      </PressableScale>
    );
  }

  return (
    <View style={[styles.container, style]} accessible accessibilityLabel={label}>
      {body}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  title: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
    flex: 1,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginVertical: 2,
    letterSpacing: -0.3,
  },
  bottomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 4,
    columnGap: 6,
    rowGap: 2,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.xs,
    gap: 2,
  },
  changeText: {
    fontSize: typography.fontSizes.xs - 1,
    fontWeight: typography.fontWeights.bold,
  },
  subtext: {
    fontSize: typography.fontSizes.xs - 1,
    color: colors.textMuted,
  },
});
