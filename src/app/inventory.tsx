import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Medicine, SupplyItem } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { colors, spacing } from '../constants/theme';
import { Header } from '../components/common/Header';
import { SearchBar } from '../components/common/SearchBar';
import { EmptyState } from '../components/common/EmptyState';
import { FadeInView, stagger } from '../components/common/Motion';
import { formScrollProps, KeyboardAwareContainer } from '../components/common/KeyboardAware';
import { MedicineRow } from '../components/operations/MedicineRow';
import { SupplyRow } from '../components/operations/SupplyRow';
import { IndentSheet } from '../components/operations/IndentSheet';
import {
  IndentTarget,
  matchesMedicineFilter,
  matchesSupplyFilter,
  MedicineFilter,
  medicineIndentTarget,
  medicineStatus,
  medicineUnit,
  needsReorder,
  SupplyFilter,
  supplyIndentTarget,
} from '../components/operations/inventory';
import { ChoiceChips, KpiRow, Notice, Segmented } from '../components/operations/OpsUI';
import { plural } from '../components/operations/utils';

type Tab = 'medicines' | 'supplies';

const MEDICINE_FILTERS: MedicineFilter[] = ['All', 'Low', 'Expiring', 'Out of stock', 'On order'];
const SUPPLY_FILTERS: SupplyFilter[] = ['All', 'Below reorder', 'On order'];

const MEDICINE_EMPTY: Record<MedicineFilter, string> = {
  All: 'No medicines in the pharmacy store',
  Low: 'No low-stock medicines',
  Expiring: 'Nothing expiring or expired',
  'Out of stock': 'Nothing is out of stock',
  'On order': 'No medicines on order',
};

/** Problems first: out of stock, expired, low, expiring — then A–Z. */
const medicineRank = (m: Medicine) => {
  const s = medicineStatus(m);
  return s.out ? 0 : s.expired ? 1 : s.low ? 2 : s.expiring ? 3 : 4;
};

export default function InventoryRoute() {
  const { medicines, supplies, raiseIndent, receiveIndent, raiseMedicineIndent, receiveMedicineIndent } = useApp();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>('medicines');
  const [query, setQuery] = useState('');
  const [medFilter, setMedFilter] = useState<MedicineFilter>('All');
  const [supplyFilter, setSupplyFilter] = useState<SupplyFilter>('All');
  const [indent, setIndent] = useState<{ open: boolean; kind: IndentTarget['kind']; id: string | null }>({
    open: false,
    kind: 'supply',
    id: null,
  });

  const q = query.trim().toLowerCase();

  const summary = useMemo(() => {
    const statuses = medicines.map((m) => ({ m, s: medicineStatus(m) }));
    return {
      belowReorder: supplies.filter(needsReorder).length,
      expiring: statuses.filter((x) => x.s.expiring).length,
      expired: statuses.filter((x) => x.s.expired).length,
      outOfStock: statuses.filter((x) => x.s.out).map((x) => x.m),
    };
  }, [medicines, supplies]);

  const searchedMeds = useMemo(
    () =>
      medicines.filter(
        (m) => !q || m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q) || m.dosageForm.toLowerCase().includes(q)
      ),
    [medicines, q]
  );
  const searchedSupplies = useMemo(
    () =>
      supplies.filter(
        (s) => !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || s.supplier.toLowerCase().includes(q)
      ),
    [supplies, q]
  );

  const visibleMeds = useMemo(
    () =>
      searchedMeds
        .filter((m) => matchesMedicineFilter(m, medFilter))
        .sort((a, b) => medicineRank(a) - medicineRank(b) || a.name.localeCompare(b.name)),
    [searchedMeds, medFilter]
  );
  const visibleSupplies = useMemo(
    () =>
      searchedSupplies
        .filter((s) => matchesSupplyFilter(s, supplyFilter))
        .sort(
          (a, b) =>
            Number(needsReorder(b)) - Number(needsReorder(a)) || a.stock / a.reorderLevel - b.stock / b.reorderLevel
        ),
    [searchedSupplies, supplyFilter]
  );

  const indentTarget: IndentTarget | null = useMemo(() => {
    if (!indent.id) return null;
    if (indent.kind === 'supply') {
      const item = supplies.find((s) => s.id === indent.id);
      return item ? supplyIndentTarget(item) : null;
    }
    const med = medicines.find((m) => m.id === indent.id);
    return med ? medicineIndentTarget(med) : null;
  }, [indent.id, indent.kind, supplies, medicines]);

  const submitIndent = (target: IndentTarget, qty: number) => {
    if (target.kind === 'supply') raiseIndent(target.id, qty);
    else raiseMedicineIndent(target.id, qty);
    setIndent((s) => ({ ...s, open: false }));
    showToast({
      title: target.kind === 'supply' ? 'Store indent raised' : 'Pharmacy indent raised',
      message: `${qty.toLocaleString('en-IN')} ${target.unit} ${target.name}${target.supplier ? ` • ${target.supplier}` : ''}`,
      type: 'success',
      icon: 'cart',
    });
  };

  const confirmReceiveMedicine = (m: Medicine) => {
    const qty = m.onOrder ?? 0;
    if (!qty) return;
    Alert.alert(
      'Confirm goods receipt',
      `${qty.toLocaleString('en-IN')} ${medicineUnit(m, qty)} of ${m.name} received into the pharmacy store?\n\nCheck batch number and expiry on the invoice.\nStock: ${m.stock.toLocaleString(
        'en-IN'
      )} → ${(m.stock + qty).toLocaleString('en-IN')}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Receive',
          onPress: () => {
            receiveMedicineIndent(m.id);
            showToast({
              title: 'Medicine received',
              message: `${qty.toLocaleString('en-IN')} ${medicineUnit(m, qty)} ${m.name} • now ${(m.stock + qty).toLocaleString('en-IN')} in stock`,
              type: 'success',
              icon: 'download',
            });
          },
        },
      ]
    );
  };

  const showMedicines = (filter: MedicineFilter) => {
    setTab('medicines');
    setMedFilter(filter);
  };

  const confirmReceive = (item: SupplyItem) => {
    const qty = item.onOrder ?? 0;
    if (!qty) return;
    Alert.alert(
      'Confirm goods receipt',
      `${qty.toLocaleString('en-IN')} ${item.unit} of ${item.name} received from ${item.supplier}?\n\nStock: ${item.stock.toLocaleString('en-IN')} → ${(
        item.stock + qty
      ).toLocaleString('en-IN')} ${item.unit}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Receive',
          onPress: () => {
            receiveIndent(item.id);
            showToast({
              title: 'Stock received',
              message: `${qty.toLocaleString('en-IN')} ${item.unit} ${item.name} • now ${(item.stock + qty).toLocaleString('en-IN')} in store`,
              type: 'success',
              icon: 'download',
            });
          },
        },
      ]
    );
  };

  const medCount = (f: MedicineFilter) => searchedMeds.filter((m) => matchesMedicineFilter(m, f)).length;
  const supplyCount = (f: SupplyFilter) => searchedSupplies.filter((s) => matchesSupplyFilter(s, f)).length;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header
        title="Inventory"
        subtitle={`Pharmacy & central store • ${plural(medicines.length, 'medicine')} • ${plural(supplies.length, 'supply item')}`}
        showBack
      />

      <KeyboardAwareContainer>
        <ScrollView
          {...formScrollProps}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        >
          <KpiRow
            items={[
              {
                key: 'reorder',
                label: 'Below reorder',
                value: summary.belowReorder,
                icon: 'trending-down',
                color: summary.belowReorder ? colors.danger : colors.success,
                bg: summary.belowReorder ? colors.dangerLight : colors.successLight,
                sub: 'supply items',
                onPress: () => {
                  setTab('supplies');
                  setSupplyFilter('Below reorder');
                },
              },
              {
                key: 'expiring',
                label: 'Expiring ≤2 mo',
                value: summary.expiring,
                icon: 'hourglass-outline',
                color: summary.expiring ? colors.warning : colors.success,
                bg: summary.expiring ? colors.warningLight : colors.successLight,
                sub: 'medicines',
                onPress: () => showMedicines('Expiring'),
              },
              {
                key: 'expired',
                label: 'Expired',
                value: summary.expired,
                icon: 'close-circle-outline',
                color: summary.expired ? colors.danger : colors.success,
                bg: summary.expired ? colors.dangerLight : colors.successLight,
                sub: summary.expired ? 'quarantine now' : 'none on shelf',
                onPress: () => showMedicines('Expiring'),
              },
            ]}
          />

          {summary.outOfStock.length > 0 && (
            <FadeInView delay={180}>
              <Notice
                tone="danger"
                title={`${plural(summary.outOfStock.length, 'medicine')} out of stock`}
                message={summary.outOfStock
                  .slice(0, 3)
                  .map((m) => m.name)
                  .join(', ')
                  .concat(summary.outOfStock.length > 3 ? ` +${summary.outOfStock.length - 3} more` : '')}
                action={{ label: 'View', onPress: () => showMedicines('Out of stock') }}
                style={styles.notice}
              />
            </FadeInView>
          )}

          <Segmented
            style={styles.tabs}
            value={tab}
            onChange={setTab}
            options={[
              { value: 'medicines' as Tab, label: 'Medicines', badge: medicines.length },
              { value: 'supplies' as Tab, label: 'Medical Supplies', badge: supplies.length },
            ]}
          />

          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder={tab === 'medicines' ? 'Search medicine, category or form…' : 'Search item, category or supplier…'}
            style={styles.search}
          />

          {tab === 'medicines' ? (
            <ChoiceChips
              scroll
              bleed={spacing.base}
              style={styles.chips}
              value={medFilter}
              onChange={setMedFilter}
              options={MEDICINE_FILTERS.map((f) => ({
                value: f,
                label: f,
                count: medCount(f),
                tone: f === 'Out of stock' ? colors.danger : f === 'On order' ? colors.info : f === 'All' ? colors.primary : colors.warning,
              }))}
            />
          ) : (
            <ChoiceChips
              scroll
              bleed={spacing.base}
              style={styles.chips}
              value={supplyFilter}
              onChange={setSupplyFilter}
              options={SUPPLY_FILTERS.map((f) => ({
                value: f,
                label: f,
                count: supplyCount(f),
                tone: f === 'Below reorder' ? colors.danger : f === 'On order' ? colors.info : colors.primary,
              }))}
            />
          )}

          <View style={styles.list}>
            {tab === 'medicines' ? (
              visibleMeds.length ? (
                visibleMeds.map((m, i) => (
                  <FadeInView key={m.id} delay={stagger(i, 40)}>
                    <MedicineRow
                      medicine={m}
                      onIndent={() => setIndent({ open: true, kind: 'medicine', id: m.id })}
                      onReceive={() => confirmReceiveMedicine(m)}
                    />
                  </FadeInView>
                ))
              ) : (
                <EmptyState
                  icon="medkit-outline"
                  title={q ? `No medicines match “${query.trim()}”` : MEDICINE_EMPTY[medFilter]}
                  description={q ? 'Try a generic name, category or dosage form.' : 'Nothing needs attention in this list.'}
                  actionTitle={q || medFilter !== 'All' ? 'Show all medicines' : undefined}
                  onActionPress={() => {
                    setQuery('');
                    setMedFilter('All');
                  }}
                />
              )
            ) : visibleSupplies.length ? (
              visibleSupplies.map((s, i) => (
                <FadeInView key={s.id} delay={stagger(i, 40)}>
                  <SupplyRow
                    item={s}
                    delay={stagger(i, 40) + 120}
                    onIndent={() => setIndent({ open: true, kind: 'supply', id: s.id })}
                    onReceive={() => confirmReceive(s)}
                  />
                </FadeInView>
              ))
            ) : (
              <EmptyState
                icon="cube-outline"
                title={q ? `No supplies match “${query.trim()}”` : `No items ${supplyFilter === 'On order' ? 'on order' : 'below reorder level'}`}
                description={q ? 'Try the item name, category or supplier.' : 'Stock levels are healthy for this view.'}
                actionTitle={q || supplyFilter !== 'All' ? 'Show all supplies' : undefined}
                onActionPress={() => {
                  setQuery('');
                  setSupplyFilter('All');
                }}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAwareContainer>

      <IndentSheet
        visible={indent.open && !!indentTarget}
        target={indentTarget}
        onClose={() => setIndent((s) => ({ ...s, open: false }))}
        onSubmit={submitIndent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
  },
  notice: {
    marginTop: spacing.md,
  },
  tabs: {
    marginTop: spacing.lg,
  },
  search: {
    marginTop: spacing.md,
  },
  chips: {
    paddingVertical: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
});
