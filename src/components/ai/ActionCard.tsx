import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AiActionCard } from '../../logic/hospital';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { PressableScale } from '../common/Motion';

const TYPE_ICON: Record<AiActionCard['type'], keyof typeof Ionicons.glyphMap> = {
  appointment: 'calendar',
  invoice: 'receipt',
  patient: 'person',
  report: 'document-text',
};

interface ActionCardProps {
  card: AiActionCard;
  onPress: (card: AiActionCard) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** The "do something with this answer" card under an AI reply. */
export const ActionCard: React.FC<ActionCardProps> = ({ card, onPress, disabled, style }) => {
  const actionable = !!card.route;
  const body = (
    <>
      <View style={styles.icon}>
        <Ionicons name={TYPE_ICON[card.type] ?? 'link'} size={17} color={colors.primary} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title} numberOfLines={2}>
          {card.title}
        </Text>
        {!!card.description && (
          <Text style={styles.desc} numberOfLines={2}>
            {card.description}
          </Text>
        )}
        {actionable && (
          <View style={styles.ctaRow}>
            <Text style={styles.cta}>{card.actionLabel ?? 'Open'}</Text>
            <Ionicons name="arrow-forward" size={13} color={colors.primary} />
          </View>
        )}
      </View>
    </>
  );

  if (!actionable) return <View style={[styles.card, style]}>{body}</View>;

  return (
    <PressableScale
      style={[styles.card, style]}
      onPress={() => onPress(card)}
      disabled={disabled}
      haptic
      accessibilityRole="button"
      accessibilityLabel={`${card.actionLabel ?? 'Open'}: ${card.title}`}
    >
      {body}
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: '#F5F9FF',
    borderWidth: 1,
    borderColor: '#CFE0FF',
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 44,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DBE7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.primaryDark,
  },
  desc: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  cta: {
    fontSize: typography.fontSizes.sm - 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
});
