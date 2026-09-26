import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { FadeInView } from '../common/Motion';
import { formatCurrency } from '../../utils/formatters';

export interface TrayItem {
  id: string;
  label: string;
  price: number;
}

interface SelectionTrayProps {
  items: TrayItem[];
  onRemove: (id: string) => void;
  onClear: () => void;
  /** Selected items the current search/tab is hiding from the list. */
  hiddenCount?: number;
  noun?: string;
}

/**
 * Everything that will be billed, always visible — even items the active filter hides.
 * (The old screens billed selections the user could no longer see.)
 */
export const SelectionTray: React.FC<SelectionTrayProps> = ({ items, onRemove, onClear, hiddenCount = 0, noun = 'item' }) => {
  if (!items.length) return null;
  const total = items.reduce((sum, i) => sum + i.price, 0);
  return (
    <FadeInView offset={8} duration={260} style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="checkmark-done-outline" size={16} color={colors.primary} />
        <Text style={styles.title}>
          {items.length} {noun}
          {items.length === 1 ? '' : 's'} selected • {formatCurrency(total)}
        </Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            onClear();
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Clear all selected ${noun}s`}
        >
          <Text style={styles.clear}>Clear</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
        {items.map((item) => (
          <View key={item.id} style={styles.chip}>
            <Text style={styles.chipText} numberOfLines={1}>
              {item.label}
            </Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                onRemove(item.id);
              }}
              hitSlop={12}
              style={styles.remove}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item.label}`}
            >
              <Ionicons name="close" size={13} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
      {hiddenCount > 0 && (
        <Text style={styles.hidden}>
          {hiddenCount} selected {noun}
          {hiddenCount === 1 ? ' is' : 's are'} hidden by the current filter — still included.
        </Text>
      )}
    </FadeInView>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary + '33',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  title: { flex: 1, fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.bold, color: colors.primaryDark },
  clear: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.bold, color: colors.primary },
  chips: { paddingHorizontal: spacing.md, gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.full,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    maxWidth: 220,
  },
  chipText: { fontSize: typography.fontSizes.xs + 1, fontWeight: typography.fontWeights.semiBold, color: colors.text, flexShrink: 1 },
  remove: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  hidden: { fontSize: typography.fontSizes.xs, color: colors.textSecondary, paddingHorizontal: spacing.md, marginTop: spacing.sm },
});
