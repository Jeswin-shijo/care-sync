import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, typography } from '../../constants/theme';
import { PressableScale } from '../common/Motion';

export type TileTone = 'danger' | 'warning' | 'info' | 'success' | 'neutral';

export interface TileBadge {
  label: string;
  tone: TileTone;
}

const TONE: Record<TileTone, { color: string; bg: string }> = {
  danger: { color: colors.danger, bg: colors.dangerLight },
  warning: { color: '#B45309', bg: colors.warningLight },
  info: { color: colors.primary, bg: colors.primaryLight },
  success: { color: '#047857', bg: colors.successLight },
  neutral: { color: colors.textSecondary, bg: colors.cardMuted },
};

interface ModuleTileProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  badge?: TileBadge;
  /** Shows a lock and dims the icon: the current role can't open this module. */
  locked?: boolean;
  onPress: () => void;
}

/** A quarter-width launcher tile (icon square, two-line label, live mini-badge). */
export const ModuleTile: React.FC<ModuleTileProps> = ({ title, icon, color, bg, badge, locked, onPress }) => (
  <PressableScale
    onPress={onPress}
    scaleTo={0.93}
    style={styles.tile}
    accessibilityRole="button"
    accessibilityLabel={`${title}${badge ? `, ${badge.label}` : ''}${locked ? ', restricted for your role' : ''}`}
  >
    <View>
      <View style={[styles.iconSquare, { backgroundColor: bg }, locked && styles.iconLocked]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      {locked && (
        <View style={styles.lock}>
          <Ionicons name="lock-closed" size={10} color={colors.textSecondary} />
        </View>
      )}
    </View>
    <Text style={[styles.title, locked && styles.titleLocked]} numberOfLines={2}>
      {title}
    </Text>
    {badge && (
      <View style={[styles.badge, { backgroundColor: TONE[badge.tone].bg }]}>
        <Text style={[styles.badgeText, { color: TONE[badge.tone].color }]} numberOfLines={1}>
          {badge.label}
        </Text>
      </View>
    )}
  </PressableScale>
);

const styles = StyleSheet.create({
  tile: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 3,
  },
  iconSquare: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLocked: {
    opacity: 0.5,
  },
  lock: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 6,
    fontSize: typography.fontSizes.xs + 0.5,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 15,
  },
  titleLocked: {
    color: colors.textSecondary,
  },
  badge: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radius.full,
    maxWidth: '100%',
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: typography.fontWeights.bold,
  },
});
