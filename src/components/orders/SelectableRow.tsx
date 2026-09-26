import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';
import { PressableScale } from '../common/Motion';
import { PopCheck } from './PopCheck';

export interface RowTag {
  label: string;
  tone?: 'muted' | 'warning' | 'info' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
}

interface SelectableRowProps {
  title: string;
  /** Left artwork (icon tile / thumbnail). */
  leading: React.ReactNode;
  meta?: string;
  tags?: RowTag[];
  price: string;
  selected: boolean;
  onToggle: () => void;
  accessibilityHint?: string;
}

const TAG_TONE: Record<NonNullable<RowTag['tone']>, { bg: string; fg: string }> = {
  muted: { bg: colors.cardMuted, fg: colors.textSecondary },
  warning: { bg: colors.warningLight, fg: colors.warningText },
  info: { bg: colors.primaryLight, fg: colors.primary },
  danger: { bg: colors.dangerLight, fg: colors.dangerText },
};

/** Multi-select catalogue row (lab tests, scans): artwork, name, meta tags, price and a pop checkbox. */
export const SelectableRow: React.FC<SelectableRowProps> = ({ title, leading, meta, tags, price, selected, onToggle, accessibilityHint }) => (
  <PressableScale
    scaleTo={0.98}
    onPress={() => {
      Haptics.selectionAsync().catch(() => {});
      onToggle();
    }}
    style={[styles.card, selected && styles.cardSelected]}
    accessibilityRole="checkbox"
    accessibilityState={{ checked: selected }}
    accessibilityLabel={`${title}, ${price}`}
    accessibilityHint={accessibilityHint}
  >
    {leading}
    <View style={styles.info}>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {!!meta && (
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      )}
      {!!tags?.length && (
        <View style={styles.tags}>
          {tags.map((tag) => {
            const tone = TAG_TONE[tag.tone ?? 'muted'];
            return (
              <View key={tag.label} style={[styles.tag, { backgroundColor: tone.bg }]}>
                {tag.icon ? <Ionicons name={tag.icon} size={11} color={tone.fg} /> : null}
                <Text style={[styles.tagText, { color: tone.fg }]} numberOfLines={1}>
                  {tag.label}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
    <View style={styles.right}>
      <Text style={styles.price}>{price}</Text>
      <PopCheck checked={selected} />
    </View>
  </PressableScale>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardSelected: { borderColor: colors.primary, backgroundColor: '#F7FAFF' },
  info: { flex: 1, minWidth: 0 },
  title: { fontSize: typography.fontSizes.sm + 1, fontWeight: typography.fontWeights.bold, color: colors.text, lineHeight: 19 },
  meta: { fontSize: typography.fontSizes.xs + 0.5, color: colors.textSecondary, marginTop: 3 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.full, maxWidth: '100%' },
  tagText: { fontSize: 10.5, fontWeight: typography.fontWeights.semiBold, flexShrink: 1 },
  right: { alignItems: 'flex-end', gap: 10 },
  price: { fontSize: typography.fontSizes.sm + 1, fontWeight: typography.fontWeights.bold, color: colors.text },
});
