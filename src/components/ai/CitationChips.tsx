import React, { useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AiCitation } from '../../logic/hospital';
import { colors, radius, spacing, typography } from '../../constants/theme';

interface CitationChipsProps {
  citations: AiCitation[];
  /** Label before the chips. */
  label?: string;
  style?: StyleProp<ViewStyle>;
}

/** "Sources: [EMR • CC202500125] [LIS SMP-2026-9024]" — tap to show what each record contributed. */
export const CitationChips: React.FC<CitationChipsProps> = ({ citations, label = 'Sources', style }) => {
  const [open, setOpen] = useState(false);
  if (!citations.length) return null;
  const hasDetail = citations.some((c) => !!c.detail);

  return (
    <View style={style}>
      <Pressable
        onPress={hasDetail ? () => setOpen((v) => !v) : undefined}
        disabled={!hasDetail}
        style={styles.row}
        accessibilityRole={hasDetail ? 'button' : undefined}
        accessibilityLabel={`${label}: ${citations.map((c) => c.label).join(', ')}`}
        accessibilityHint={hasDetail ? (open ? 'Hides source details' : 'Shows source details') : undefined}
        hitSlop={4}
      >
        <Text style={styles.label}>{label}</Text>
        {citations.map((c, i) => (
          <View key={`${c.label}-${i}`} style={styles.chip}>
            <Ionicons name="document-text-outline" size={11} color={colors.primary} />
            <Text style={styles.chipText} numberOfLines={1}>
              {c.label}
            </Text>
          </View>
        ))}
        {hasDetail && <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={12} color={colors.textMuted} />}
      </Pressable>
      {open && (
        <View style={styles.details}>
          {citations.map((c, i) => (
            <Text key={`d-${c.label}-${i}`} style={styles.detail}>
              <Text style={styles.detailLabel}>{c.label}</Text>
              {c.detail ? ` — ${c.detail}` : ''}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: typography.fontSizes.xs - 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 220,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: '#D6E6FF',
  },
  chipText: {
    flexShrink: 1,
    fontSize: typography.fontSizes.xs - 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.primaryDark,
  },
  details: {
    marginTop: spacing.xs,
    paddingLeft: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: '#D6E6FF',
    gap: 2,
  },
  detail: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  detailLabel: {
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
});
