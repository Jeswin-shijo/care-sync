import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { formatCurrency } from '../../utils/formatters';
import { BottomSheet } from '../common/BottomSheet';
import { Button } from '../common/Button';
import { SearchBar } from '../common/SearchBar';
import { FilterChips } from './FilterChips';
import { CATALOG_ICON, CATALOG_TABS, type CatalogEntry, type CatalogKind } from './catalog';

interface CatalogSheetProps {
  visible: boolean;
  onClose: () => void;
  catalog: Record<CatalogKind, CatalogEntry[]>;
  initialTab: CatalogKind;
  /** Quantity of each catalogue item already on the invoice. */
  addedQty: Record<string, number>;
  onAdd: (entry: CatalogEntry) => void;
  onAddCustom: () => void;
}

const TAB_LABEL: Record<CatalogKind, string> = Object.fromEntries(CATALOG_TABS.map((t) => [t.kind, t.label])) as Record<CatalogKind, string>;

/** Pick billable items from the hospital catalogues; stays open so several items can be added. */
export const CatalogSheet: React.FC<CatalogSheetProps> = ({ visible, onClose, catalog, initialTab, addedQty, onAdd, onAddCustom }) => {
  const [tab, setTab] = useState<CatalogKind>(initialTab);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (visible) {
      setTab(initialTab);
      setQuery('');
    }
  }, [visible, initialTab]);

  const q = query.trim().toLowerCase();
  const entries = useMemo(() => {
    if (!q) return catalog[tab];
    return CATALOG_TABS.flatMap((t) => catalog[t.kind]).filter(
      (e) => e.name.toLowerCase().includes(q) || (e.detail ?? '').toLowerCase().includes(q)
    );
  }, [catalog, tab, q]);

  const addedCount = Object.values(addedQty).reduce((n, v) => n + (v > 0 ? 1 : 0), 0);
  const chips = CATALOG_TABS.map((t) => ({
    key: t.kind,
    label: t.label,
    count: catalog[t.kind].filter((e) => (addedQty[e.key] ?? 0) > 0).length || undefined,
  }));

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Add Items"
      subtitle={addedCount ? `${addedCount} item${addedCount === 1 ? '' : 's'} on this invoice` : 'Tap an item to add it to the invoice'}
      maxHeight={0.9}
      footer={<Button title={addedCount ? `Done • ${addedCount} item${addedCount === 1 ? '' : 's'}` : 'Done'} onPress={onClose} fullWidth size="lg" />}
    >
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search tests, scans, medicines, services…" />
      {!q && <FilterChips items={chips} active={tab} onChange={(k) => setTab(k as CatalogKind)} style={styles.chips} />}
      {!!q && (
        <Text style={styles.searchMeta}>
          {entries.length} match{entries.length === 1 ? '' : 'es'} across all catalogues
        </Text>
      )}

      <View style={styles.list}>
        {entries.map((e) => {
          const qty = addedQty[e.key] ?? 0;
          const atMax = typeof e.maxQty === 'number' && qty >= e.maxQty;
          const disabled = !!e.disabledReason || atMax;
          return (
            <TouchableOpacity
              key={e.key}
              style={[styles.row, qty > 0 && styles.rowAdded, disabled && styles.rowDisabled]}
              activeOpacity={0.7}
              disabled={disabled}
              onPress={() => onAdd(e)}
              accessibilityRole="button"
              accessibilityLabel={`Add ${e.name}, ${formatCurrency(e.rate)}${e.unit ? ` ${e.unit}` : ''}`}
              accessibilityState={{ disabled }}
            >
              <View style={styles.icon}>
                <Ionicons name={CATALOG_ICON[e.kind]} size={18} color={colors.primary} />
              </View>
              <View style={styles.body}>
                <Text style={styles.name} numberOfLines={2}>
                  {e.name}
                </Text>
                <Text style={styles.detail} numberOfLines={1}>
                  {q ? `${TAB_LABEL[e.kind]} • ` : ''}
                  {e.disabledReason ?? (atMax ? 'All stock already on this invoice' : e.detail ?? '')}
                </Text>
              </View>
              <View style={styles.right}>
                <Text style={styles.rate}>{formatCurrency(e.rate)}</Text>
                {!!e.unit && <Text style={styles.unit}>{e.unit}</Text>}
                {qty > 0 ? (
                  <View style={styles.addedPill}>
                    <Ionicons name="checkmark" size={12} color={colors.success} />
                    <Text style={styles.addedText}>{qty}</Text>
                  </View>
                ) : !disabled ? (
                  <Text style={styles.addText}>Add</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
        {!entries.length && <Text style={styles.empty}>No items match “{query.trim()}”. Add it as a custom line instead.</Text>}
      </View>

      <TouchableOpacity style={styles.custom} onPress={onAddCustom} accessibilityRole="button" accessibilityLabel="Add a custom line">
        <Ionicons name="create-outline" size={18} color={colors.primary} />
        <Text style={styles.customText}>Add a custom line</Text>
      </TouchableOpacity>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  chips: {
    marginTop: spacing.md,
    marginHorizontal: -spacing.lg,
  },
  searchMeta: {
    marginTop: spacing.md,
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.semiBold,
  },
  list: {
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 60,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowAdded: {
    backgroundColor: colors.successLight,
    borderBottomColor: 'transparent',
  },
  rowDisabled: {
    opacity: 0.5,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  name: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  detail: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    minWidth: 64,
  },
  rate: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  unit: {
    fontSize: 10,
    color: colors.textMuted,
  },
  addText: {
    marginTop: 3,
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  addedPill: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
    backgroundColor: '#FFFFFF',
  },
  addedText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.success,
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    paddingVertical: spacing.xl,
    fontSize: typography.fontSizes.sm,
  },
  custom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.base,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
  },
  customText: {
    color: colors.primary,
    fontWeight: typography.fontWeights.semiBold,
    fontSize: typography.fontSizes.sm + 1,
  },
});
