import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, spacing, typography } from '../../../constants/theme';
import { AnimatedNumber, FadeInView, PressableScale, PulseDot, stagger } from '../../common/Motion';

export interface CopilotStatTile {
  key: string;
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
  /** Adds a live pulse (e.g. critical alerts present). */
  live?: boolean;
  hint: string;
}

/** Design: Today's Patients • Pending Reports • AI Alerts • Notes Pending — live counts, each tappable. */
export const CopilotStats = React.memo(function CopilotStats({ tiles }: { tiles: CopilotStatTile[] }) {
  return (
  <View style={styles.row}>
    {tiles.map((t, i) => (
      <FadeInView key={t.key} delay={stagger(i, 50)} style={styles.cell}>
        <PressableScale
          style={styles.tile}
          onPress={t.onPress}
          haptic
          accessibilityRole="button"
          accessibilityLabel={`${t.label}: ${t.value}`}
          accessibilityHint={t.hint}
        >
          <View style={styles.top}>
            <View style={[styles.icon, { backgroundColor: `${t.color}18` }]}>
              <Ionicons name={t.icon} size={14} color={t.color} />
            </View>
            {t.live && <PulseDot size={7} color={colors.danger} />}
          </View>
          <AnimatedNumber value={t.value} style={[styles.value, { color: t.value ? colors.text : colors.textMuted }]} delay={120 + i * 60} />
          <Text style={styles.label} numberOfLines={2}>
            {t.label}
          </Text>
        </PressableScale>
      </FadeInView>
    ))}
  </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cell: {
    flex: 1,
  },
  tile: {
    minHeight: 96,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm + 2,
    ...shadows.sm,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  icon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: typography.fontSizes.xl + 2,
    fontWeight: typography.fontWeights.extraBold,
    marginTop: 6,
  },
  label: {
    fontSize: typography.fontSizes.xs - 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
    marginTop: 1,
    lineHeight: 13,
  },
});
