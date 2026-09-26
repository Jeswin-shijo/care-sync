import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { PressableScale } from '../common/Motion';

interface FollowUpChipsProps {
  items: string[];
  onPress: (text: string) => void;
  disabled?: boolean;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

/** Suggested next questions under an answer — tapping sends them. */
export const FollowUpChips: React.FC<FollowUpChipsProps> = ({ items, onPress, disabled, label = 'Ask next', style }) => {
  if (!items.length) return null;
  return (
    <View style={style}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.wrap}>
        {items.map((text) => (
          <PressableScale
            key={text}
            style={styles.chip}
            onPress={() => onPress(text)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`Ask: ${text}`}
          >
            <Ionicons name="return-down-forward" size={13} color={colors.primary} />
            <Text style={styles.chipText} numberOfLines={2}>
              {text}
            </Text>
          </PressableScale>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: typography.fontSizes.xs - 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CFE0FF',
  },
  chipText: {
    flexShrink: 1,
    fontSize: typography.fontSizes.sm - 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.primaryDark,
  },
});
