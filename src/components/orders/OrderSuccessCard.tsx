import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { FadeInView, useReducedMotion } from '../common/Motion';

/** Check mark that springs in with an expanding halo — plays once on mount. */
export const SuccessCheck: React.FC<{ size?: number; color?: string; icon?: keyof typeof Ionicons.glyphMap }> = ({
  size = 76,
  color = colors.success,
  icon = 'checkmark',
}) => {
  const reduced = useReducedMotion();
  const pop = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const halo = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (reduced) return;
    const anim = Animated.parallel([
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 9, bounciness: 14 }),
      Animated.timing(halo, { toValue: 1, duration: 900, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View style={{ width: size * 1.7, height: size * 1.7, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: halo.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
          transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }],
        }}
      />
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pop.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
          transform: [
            { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
            { rotate: pop.interpolate({ inputRange: [0, 1], outputRange: ['-30deg', '0deg'] }) },
          ],
        }}
      >
        <Ionicons name={icon} size={size * 0.56} color="#FFFFFF" />
      </Animated.View>
    </View>
  );
};

interface OrderSuccessCardProps {
  title: string;
  subtitle?: string;
  /** Big highlighted value, e.g. { label: 'Token', value: '#3' }. */
  highlight?: { label: string; value: string };
  children?: React.ReactNode;
  tone?: 'success' | 'warning';
}

/** Success state shown inside a sheet after an order/booking is placed. */
export const OrderSuccessCard: React.FC<OrderSuccessCardProps> = ({ title, subtitle, highlight, children, tone = 'success' }) => (
  <View style={styles.wrap}>
    <SuccessCheck color={tone === 'warning' ? colors.warning : colors.success} />
    <FadeInView delay={160} offset={10}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </FadeInView>
    {highlight && (
      <FadeInView delay={240} offset={10} style={styles.highlight}>
        <Text style={styles.highlightLabel}>{highlight.label}</Text>
        <Text style={styles.highlightValue}>{highlight.value}</Text>
      </FadeInView>
    )}
    <FadeInView delay={320} offset={10} style={styles.details}>
      {children}
    </FadeInView>
  </View>
);

interface DetailRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueTone?: 'default' | 'success' | 'warning';
  last?: boolean;
}

export const DetailRow: React.FC<DetailRowProps> = ({ icon, label, value, valueTone = 'default', last }) => (
  <View style={[styles.row, last && styles.rowLast]}>
    <View style={styles.rowIcon}>
      <Ionicons name={icon} size={15} color={colors.primary} />
    </View>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text
      style={[
        styles.rowValue,
        valueTone === 'success' && { color: colors.success },
        valueTone === 'warning' && { color: colors.warningText },
      ]}
      numberOfLines={2}
    >
      {value}
    </Text>
  </View>
);

interface LinkRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
}

/** Tappable row, e.g. "View receipt ›". */
export const LinkRow: React.FC<LinkRowProps> = ({ icon, title, subtitle, onPress }) => (
  <TouchableOpacity style={styles.link} onPress={onPress} activeOpacity={0.75} accessibilityRole="link">
    <View style={styles.linkIcon}>
      <Ionicons name={icon} size={18} color={colors.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.linkTitle}>{title}</Text>
      {!!subtitle && (
        <Text style={styles.linkSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      )}
    </View>
    <Ionicons name="chevron-forward" size={18} color={colors.primary} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: spacing.xs },
  title: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: { fontSize: typography.fontSizes.sm, color: colors.textSecondary, textAlign: 'center', marginTop: 4 },
  highlight: {
    marginTop: spacing.base,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
  },
  highlightLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  highlightValue: { fontSize: 30, fontWeight: typography.fontWeights.extraBold, color: colors.primaryDark, marginTop: 2 },
  details: { alignSelf: 'stretch', marginTop: spacing.base },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { fontSize: typography.fontSizes.sm, color: colors.textSecondary, width: 84 },
  rowValue: { flex: 1, fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semiBold, color: colors.text, textAlign: 'right' },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary + '33',
    backgroundColor: '#F7FAFF',
    minHeight: 56,
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkTitle: { fontSize: typography.fontSizes.sm + 1, fontWeight: typography.fontWeights.bold, color: colors.primary },
  linkSubtitle: { fontSize: typography.fontSizes.xs + 0.5, color: colors.textSecondary, marginTop: 1 },
});
