import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, useNavigation, type Href } from 'expo-router';
import type { Invoice } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { SearchBar } from '../../components/common/SearchBar';
import { Badge, statusVariant } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { AnimatedNumber, FadeInView, PressableScale, PulseDot } from '../../components/common/Motion';
import { KeyboardAwareContainer, formScrollProps, useKeyboardHeight } from '../../components/common/KeyboardAware';
import { FilterChips } from '../../components/finance/FilterChips';
import { BarChart } from '../../components/finance/BarChart';
import { ActionMenuSheet } from '../../components/finance/ActionMenuSheet';
import {
  BILLING_FILTERS,
  INVOICE_TYPE_META,
  invoiceDisplayTime,
  parseBillingFilter,
  type BillingFilterKey,
} from '../../components/finance/invoiceUtils';
import { formatCompactCurrency, formatCurrency } from '../../utils/formatters';
import { clockToMinutes, relativeDayLabel } from '../../utils/dates';

type Row =
  | { kind: 'day'; key: string; title: string; count: number; collected: number; due: number }
  | { kind: 'invoice'; key: string; invoice: Invoice; index: number };

const sortStamp = (inv: Invoice) => `${inv.dateISO ?? ''}|${String(clockToMinutes(invoiceDisplayTime(inv))).padStart(4, '0')}`;

export default function BillingRoute() {
  const { invoices, todayStats, getRevenue } = useApp();
  const params = useLocalSearchParams<{ filter?: string }>();
  const navigation = useNavigation();
  const listRef = useRef<FlatList<Row>>(null);
  const keyboardOpen = useKeyboardHeight() > 0;

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<BillingFilterKey>(() => parseBillingFilter(params.filter) ?? 'All');
  const [menuOpen, setMenuOpen] = useState(false);

  // Deep links such as { filter: 'Pending' } pre-select a chip, then the param is cleared so the
  // same link works again after the user changes the filter by hand.
  useEffect(() => {
    if (!params.filter) return;
    const next = parseBillingFilter(params.filter);
    if (next) {
      setFilter(next);
      setQuery('');
    }
    navigation.setParams({ filter: undefined } as never);
  }, [params.filter]);

  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [filter]);

  const revenue = getRevenue('today');

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return invoices;
    const compact = q.replace(/[\s-]/g, '');
    const looksLikeAmount = /^[₹\d,.\s]+$/.test(q);
    const digits = q.replace(/[^\d]/g, '');
    return invoices.filter(
      (inv) =>
        inv.patientName.toLowerCase().includes(q) ||
        inv.title.toLowerCase().includes(q) ||
        inv.uhid.toLowerCase().includes(compact) ||
        inv.invoiceNo.toLowerCase().replace(/-/g, '').includes(compact.replace(/-/g, '')) ||
        (looksLikeAmount && digits.length > 0 && String(Math.round(inv.amount)).includes(digits))
    );
  }, [invoices, query]);

  const chips = useMemo(
    () =>
      BILLING_FILTERS.map((f) => ({
        key: f.key,
        label: f.label,
        count: searched.filter(f.match).length,
        tone: f.key === 'Pending' ? ('warning' as const) : ('default' as const),
      })),
    [searched]
  );

  const activeFilter = BILLING_FILTERS.find((f) => f.key === filter) ?? BILLING_FILTERS[0];

  const rows = useMemo<Row[]>(() => {
    const list = searched.filter(activeFilter.match).sort((a, b) => (sortStamp(a) < sortStamp(b) ? 1 : -1));
    const out: Row[] = [];
    let current: Extract<Row, { kind: 'day' }> | null = null;
    let index = 0;
    list.forEach((inv) => {
      const dayKey = inv.dateISO ?? inv.date;
      if (!current || current.key !== `day-${dayKey}`) {
        current = {
          kind: 'day',
          key: `day-${dayKey}`,
          title: inv.dateISO ? relativeDayLabel(inv.dateISO) : inv.date,
          count: 0,
          collected: 0,
          due: 0,
        };
        out.push(current);
      }
      current.count += 1;
      if (inv.status === 'Paid') current.collected += inv.amount;
      else current.due += inv.amount;
      out.push({ kind: 'invoice', key: inv.id, invoice: inv, index: index++ });
    });
    return out;
  }, [searched, activeFilter]);

  const createHref: Href = activeFilter.invoiceType
    ? { pathname: '/create-invoice', params: { type: activeFilter.invoiceType } }
    : '/create-invoice';

  const growthUp = revenue.growthPct >= 0;

  const header = (
    <FadeInView>
      <PressableScale
        style={styles.collectionCard}
        onPress={() => router.push('/financial-management')}
        accessibilityRole="button"
        accessibilityLabel={`Today's collection ${formatCurrency(todayStats.todayCollection)}. Open financial management`}
      >
        <LinearGradient colors={['#EAF2FF', '#FFFFFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.collectionTop}>
          <View style={styles.collectionLeft}>
            <View style={styles.liveRow}>
              <Text style={styles.collectionLabel}>Today's Collection</Text>
              <PulseDot size={6} />
            </View>
            <AnimatedNumber
              value={todayStats.todayCollection}
              format={(n) => formatCurrency(Math.round(n))}
              style={styles.collectionAmount}
            />
            <View style={[styles.growthChip, !growthUp && styles.growthChipDown]}>
              <Ionicons name={growthUp ? 'arrow-up' : 'arrow-down'} size={12} color={growthUp ? colors.success : colors.danger} />
              <Text style={[styles.growthText, !growthUp && { color: colors.danger }]}>
                {Math.abs(revenue.growthPct)}% {revenue.comparedTo}
              </Text>
            </View>
          </View>
          <BarChart
            data={revenue.chart}
            height={56}
            barMaxWidth={9}
            gap={4}
            showValues="none"
            showLabels={false}
            color={colors.primary + '45'}
            style={styles.miniChart}
            accessibilityTitle="Collection by hour"
            formatValue={formatCompactCurrency}
          />
        </View>
        {todayStats.pendingCount > 0 ? (
          <Pressable
            style={({ pressed }) => [styles.pendingStrip, pressed && { opacity: 0.7 }]}
            onPress={() => setFilter('Pending')}
            accessibilityRole="button"
            accessibilityLabel={`Show ${todayStats.pendingCount} pending invoices`}
          >
            <Ionicons name="time-outline" size={16} color={colors.warningText} />
            <Text style={styles.pendingText} numberOfLines={1}>
              Pending {formatCurrency(todayStats.pendingAmount)} ({todayStats.pendingCount})
            </Text>
            <Text style={styles.pendingLink}>Review ›</Text>
          </Pressable>
        ) : (
          <View style={[styles.pendingStrip, styles.clearStrip]}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={[styles.pendingText, { color: colors.successText }]}>All bills collected</Text>
          </View>
        )}
      </PressableScale>
    </FadeInView>
  );

  const empty = query.trim() ? (
    <EmptyState
      icon="search-outline"
      title="No matching invoices"
      description={`Nothing matches “${query.trim()}”${filter !== 'All' ? ` in ${activeFilter.label}` : ''}. Try a name, UHID, receipt number or amount.`}
      actionTitle="Clear search"
      onActionPress={() => setQuery('')}
    />
  ) : filter === 'Pending' ? (
    <EmptyState icon="checkmark-done-outline" title="No pending bills" description="Every invoice has been collected." actionTitle="Show all invoices" onActionPress={() => setFilter('All')} />
  ) : (
    <EmptyState
      icon="receipt-outline"
      title={`No ${activeFilter.label} invoices yet`}
      description="Bills raised for this category will appear here."
      actionTitle="Create Invoice"
      onActionPress={() => router.push(createHref)}
    />
  );

  const renderRow = ({ item }: { item: Row }) => {
    if (item.kind === 'day') {
      return (
        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>{item.title}</Text>
          <Text style={styles.dayMeta} numberOfLines={1}>
            {item.count} bill{item.count === 1 ? '' : 's'}
            {item.collected ? ` • ${formatCurrency(item.collected)} collected` : ''}
            {item.due ? ` • ${formatCurrency(item.due)} due` : ''}
          </Text>
        </View>
      );
    }
    const inv = item.invoice;
    const meta = INVOICE_TYPE_META[inv.type];
    const paid = inv.status === 'Paid';
    return (
      <FadeInView delay={Math.min(item.index, 6) * 50}>
        <PressableScale
          style={styles.invoiceCard}
          onPress={() => router.push({ pathname: '/receipt/[id]', params: { id: inv.id } })}
          accessibilityRole="button"
          accessibilityLabel={`${inv.title}, ${inv.patientName}, ${formatCurrency(inv.amount)}, ${inv.status}`}
        >
          <View style={[styles.typeIcon, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={20} color={meta.color} />
          </View>
          <View style={styles.invBody}>
            <Text style={styles.invNo} numberOfLines={1}>
              {inv.invoiceNo}
            </Text>
            <Text style={styles.invTitle} numberOfLines={1}>
              {inv.title}
            </Text>
            <Text style={styles.invPatient} numberOfLines={1}>
              {inv.patientName} • {inv.uhid}
            </Text>
            <View style={styles.invMetaRow}>
              <Badge label={inv.status} variant={statusVariant(inv.status)} size="sm" />
              <Text style={styles.invMeta} numberOfLines={1}>
                {paid ? inv.paymentMode : 'Awaiting payment'} • {invoiceDisplayTime(inv)}
              </Text>
            </View>
          </View>
          <View style={styles.invRight}>
            <Text style={[styles.invAmount, !paid && { color: colors.warningText }]}>{formatCurrency(inv.amount)}</Text>
            <Text style={styles.viewLink}>{paid ? 'View ›' : 'Collect ›'}</Text>
          </View>
        </PressableScale>
      </FadeInView>
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header
        title="Billing & Invoices"
        subtitle={`${invoices.length} invoices • ${formatCurrency(todayStats.pendingAmount)} pending`}
        showBack={false}
        rightAction={
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setMenuOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Billing menu"
            hitSlop={6}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
          </TouchableOpacity>
        }
      />

      <KeyboardAwareContainer>
        <View style={styles.searchSection}>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search patient, invoice, UHID or amount…" />
        </View>
        <FilterChips items={chips} active={filter} onChange={(k) => setFilter(k as BillingFilterKey)} style={styles.chips} />

        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(r) => r.key}
          renderItem={renderRow}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={14}
          {...formScrollProps}
        />

        {!keyboardOpen && (
          <PressableScale
            haptic
            style={styles.fab}
            onPress={() => router.push(createHref)}
            accessibilityRole="button"
            accessibilityLabel="Create invoice"
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.fabText}>Create Invoice</Text>
          </PressableScale>
        )}
      </KeyboardAwareContainer>

      <ActionMenuSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Billing"
        subtitle="Invoices, templates and finance"
        actions={[
          {
            key: 'create',
            label: 'Create invoice',
            description: 'Generate a bill or receipt for a patient',
            icon: 'add-circle-outline',
            onPress: () => router.push(createHref),
          },
          {
            key: 'templates',
            label: 'Receipt templates',
            description: 'Preview every receipt & bill format',
            icon: 'documents-outline',
            color: colors.purple,
            onPress: () => router.push('/receipt-templates'),
          },
          {
            key: 'finance',
            label: 'Financial management',
            description: 'Revenue by category, payment modes, receivables',
            icon: 'stats-chart-outline',
            color: colors.success,
            onPress: () => router.push('/financial-management'),
          },
          {
            key: 'daily',
            label: 'Daily collection report',
            description: 'Every receipt today with the mode split',
            icon: 'cash-outline',
            color: colors.teal,
            onPress: () => router.push({ pathname: '/report/[id]', params: { id: 'daily-collection' } }),
          },
          {
            key: 'reports',
            label: 'All reports',
            description: 'Financial, patient and operational reports',
            icon: 'bar-chart-outline',
            color: colors.orange,
            onPress: () => router.push('/reports'),
          },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSection: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  chips: {
    marginBottom: spacing.xs,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: 104,
    flexGrow: 1,
  },
  collectionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary + '1F',
    padding: spacing.base,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    ...shadows.sm,
  },
  collectionTop: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  collectionLeft: {
    flex: 1,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  collectionLabel: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.semiBold,
  },
  collectionAmount: {
    fontSize: 28,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.text,
    marginTop: 2,
    letterSpacing: -0.5,
  },
  growthChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    backgroundColor: colors.successLight,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
  },
  growthChipDown: {
    backgroundColor: colors.dangerLight,
  },
  growthText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.success,
  },
  miniChart: {
    width: 104,
  },
  pendingStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningLight,
  },
  clearStrip: {
    backgroundColor: colors.successLight,
  },
  pendingText: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.warningText,
  },
  pendingLink: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.warningText,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  dayTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  dayMeta: {
    flex: 1,
    textAlign: 'right',
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.semiBold,
  },
  invoiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invBody: {
    flex: 1,
    minWidth: 0,
  },
  invNo: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
    letterSpacing: 0.2,
  },
  invTitle: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: 1,
  },
  invPatient: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  invMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
  },
  invMeta: {
    flex: 1,
    fontSize: 11,
    color: colors.textMuted,
  },
  invRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  invAmount: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  viewLink: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  fab: {
    position: 'absolute',
    right: spacing.base,
    bottom: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
  },
});
