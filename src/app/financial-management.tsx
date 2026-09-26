import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import type { RevenuePeriod } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { paymentModeSplit, pendingInvoices } from '../logic/billing';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { Button } from '../components/common/Button';
import { FilterTabs } from '../components/common/FilterTabs';
import { SectionHeader } from '../components/common/SectionHeader';
import { AnimatedNumber, FadeInView, PressableScale, ProgressFill, PulseDot } from '../components/common/Motion';
import { BarChart } from '../components/finance/BarChart';
import { openBillingTab, pushOrPopTo } from '../components/finance/financeNavigation';
import { PAYMENT_MODE_META, PAYMENT_MODE_ORDER, type IconName } from '../components/finance/invoiceUtils';
import { formatCompactCurrency, formatCurrency } from '../utils/formatters';
import { relativeDayLabel, todayISO } from '../utils/dates';

const PERIODS: Array<{ key: RevenuePeriod; label: string; chartTitle: string }> = [
  { key: 'today', label: 'Today', chartTitle: 'Collection by hour' },
  { key: 'week', label: 'This Week', chartTitle: 'Daily collection this week' },
  { key: 'month', label: 'This Month', chartTitle: 'Weekly collection this month' },
];

export default function FinancialManagementRoute() {
  const { getRevenue, invoices } = useApp();
  const params = useLocalSearchParams<{ period?: string }>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<RevenuePeriod>(
    () => PERIODS.find((p) => p.key === String(params.period ?? '').toLowerCase())?.key ?? 'today'
  );
  const current = PERIODS.find((p) => p.key === period) ?? PERIODS[0];
  const rev = getRevenue(period);
  const growthUp = rev.growthPct >= 0;

  const categories: Array<{
    key: string;
    label: string;
    icon: IconName;
    color: string;
    bg: string;
    amount: number;
    count: number;
    unit: string;
    filter: string;
  }> = [
    { key: 'opd', label: 'OPD Collection', icon: 'medkit', color: '#1E6BFF', bg: '#EFF6FF', amount: rev.opd.amount, count: rev.opd.count, unit: 'consultations', filter: 'OPD' },
    { key: 'ipd', label: 'IPD Collection', icon: 'bed', color: '#8B5CF6', bg: '#F5F3FF', amount: rev.ipd.amount, count: rev.ipd.count, unit: 'in-patient bills', filter: 'IPD' },
    { key: 'pharmacy', label: 'Pharmacy', icon: 'bandage', color: '#F59E0B', bg: '#FFFBEB', amount: rev.pharmacy.amount, count: rev.pharmacy.count, unit: 'prescriptions', filter: 'Pharmacy' },
    { key: 'diagnostics', label: 'Lab & Radiology', icon: 'flask', color: '#0D9488', bg: '#F0FDFA', amount: rev.diagnostics.amount, count: rev.diagnostics.count, unit: 'tests', filter: 'Diagnostics' },
    { key: 'other', label: 'Procedures & Other', icon: 'cut', color: '#EC4899', bg: '#FDF2F8', amount: rev.other.amount, count: rev.other.count, unit: 'procedures', filter: 'Surgery' },
  ];

  const peak = rev.chart.reduce<{ label: string; value: number } | null>((best, c) => (!best || c.value > best.value ? c : best), null);

  const today = todayISO();
  const split = useMemo(() => paymentModeSplit(invoices, today), [invoices, today]);
  const splitTotal = PAYMENT_MODE_ORDER.reduce((n, m) => n + split[m], 0);
  const receiptsToday = invoices.filter((i) => i.status === 'Paid' && i.dateISO === today).length;

  const receivables = useMemo(() => pendingInvoices(invoices), [invoices]);
  const receivableTotal = receivables.reduce((n, i) => n + i.amount, 0);

  const openReport = () =>
    pushOrPopTo(navigation.getState(), 'report/[id]', { pathname: '/report/[id]', params: { id: 'daily-collection' } });

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header
        title="Financial Management"
        subtitle="Revenue, collections & receivables"
        showBack
        rightAction={
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => pushOrPopTo(navigation.getState(), 'reports', '/reports')}
            accessibilityRole="button"
            accessibilityLabel="Open reports"
            hitSlop={6}
          >
            <Ionicons name="bar-chart-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        {/* Total */}
        <FadeInView>
          <View style={styles.totalCard}>
            <View style={styles.totalLabelRow}>
              <Text style={styles.totalLabel}>Total Revenue • {current.label}</Text>
              {period === 'today' && <PulseDot size={6} />}
            </View>
            <AnimatedNumber value={rev.total} format={(n) => formatCurrency(Math.round(n))} style={styles.totalAmount} />
            <View style={[styles.growth, !growthUp && styles.growthDown]}>
              <Ionicons name={growthUp ? 'trending-up' : 'trending-down'} size={14} color={growthUp ? colors.success : colors.danger} />
              <Text style={[styles.growthText, !growthUp && { color: colors.danger }]}>
                {growthUp ? '+' : '−'}
                {Math.abs(rev.growthPct)}% {rev.comparedTo}
              </Text>
            </View>
          </View>
        </FadeInView>

        <FilterTabs
          tabs={PERIODS.map((p) => p.label)}
          activeTab={current.label}
          onSelectTab={(label) => setPeriod(PERIODS.find((p) => p.label === label)?.key ?? 'today')}
          scrollable={false}
          style={styles.periodTabs}
        />

        {/* Categories */}
        <View style={styles.grid}>
          {categories.map((c, i) => {
            const share = rev.total > 0 ? c.amount / rev.total : 0;
            const wide = i === categories.length - 1 && categories.length % 2 === 1;
            return (
              <FadeInView key={c.key} delay={60 + i * 50} style={wide ? styles.cellWide : styles.cell}>
                <PressableScale
                  style={styles.catCard}
                  onPress={() => openBillingTab(c.filter)}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.label} ${formatCurrency(c.amount)}, ${c.count} ${c.unit}. Show invoices`}
                >
                  <View style={styles.catHead}>
                    <Text style={styles.catLabel} numberOfLines={1}>
                      {c.label}
                    </Text>
                    <View style={[styles.catIcon, { backgroundColor: c.bg }]}>
                      <Ionicons name={c.icon} size={15} color={c.color} />
                    </View>
                  </View>
                  <AnimatedNumber value={c.amount} format={(n) => formatCurrency(Math.round(n))} style={styles.catValue} />
                  <Text style={styles.catSub} numberOfLines={1}>
                    {c.count.toLocaleString('en-IN')} {c.unit} • {Math.round(share * 100)}%
                  </Text>
                  <ProgressFill progress={share} color={c.color} height={4} delay={120 + i * 60} style={styles.catBar} />
                </PressableScale>
              </FadeInView>
            );
          })}
        </View>
        <Text style={styles.reconcile}>
          Categories add up to {formatCurrency(rev.total)} • tap one to see its invoices
        </Text>

        {/* Chart */}
        <FadeInView delay={200}>
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>{current.chartTitle}</Text>
              {peak && peak.value > 0 && (
                <Text style={styles.cardMeta}>
                  Peak {peak.label} • {formatCompactCurrency(peak.value)}
                </Text>
              )}
            </View>
            <BarChart
              key={period}
              data={rev.chart}
              height={130}
              barMaxWidth={period === 'month' ? 44 : 26}
              formatValue={formatCompactCurrency}
              showValues="max"
              accessibilityTitle={current.chartTitle}
            />
          </View>
        </FadeInView>

        {/* Payment modes */}
        <FadeInView delay={260}>
          <SectionHeader title="Payment modes" meta={`Today • ${receiptsToday} receipt${receiptsToday === 1 ? '' : 's'}`} />
          <View style={styles.card}>
            {splitTotal === 0 ? (
              <Text style={styles.emptyText}>No receipts collected in CareSync yet today.</Text>
            ) : (
              PAYMENT_MODE_ORDER.map((m, i) => {
                const meta = PAYMENT_MODE_META[m];
                const share = split[m] / splitTotal;
                return (
                  <View key={m} style={[styles.modeRow, i > 0 && styles.modeRowGap]}>
                    <View style={[styles.modeIcon, { backgroundColor: meta.color + '16' }]}>
                      <Ionicons name={meta.icon} size={16} color={meta.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.modeTop}>
                        <Text style={styles.modeLabel}>{m}</Text>
                        <Text style={styles.modeValue}>
                          {formatCurrency(split[m])} <Text style={styles.modePct}>• {Math.round(share * 100)}%</Text>
                        </Text>
                      </View>
                      <ProgressFill progress={share} color={meta.color} height={6} delay={300 + i * 70} />
                    </View>
                  </View>
                );
              })
            )}
            <Text style={styles.footnote}>Itemised CareSync receipts only; hospital-wide counters are included in the totals above.</Text>
          </View>
        </FadeInView>

        {/* Receivables */}
        <FadeInView delay={320}>
          <SectionHeader
            title="Receivables"
            meta={`${receivables.length} pending`}
            actionLabel={receivables.length ? 'View all' : undefined}
            onActionPress={() => openBillingTab('Pending')}
          />
          <View style={styles.card}>
            <View style={styles.recvHead}>
              <View>
                <Text style={styles.recvLabel}>Outstanding</Text>
                <AnimatedNumber value={receivableTotal} format={(n) => formatCurrency(Math.round(n))} style={styles.recvTotal} />
              </View>
              <View style={styles.recvIcon}>
                <Ionicons name="time-outline" size={20} color={colors.warningText} />
              </View>
            </View>
            {receivables.length === 0 ? (
              <Text style={styles.emptyText}>Every invoice is collected.</Text>
            ) : (
              receivables.slice(0, 3).map((inv) => (
                <TouchableOpacity
                  key={inv.id}
                  style={styles.recvRow}
                  onPress={() => router.push({ pathname: '/receipt/[id]', params: { id: inv.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${inv.patientName}, ${inv.title}, ${formatCurrency(inv.amount)} due`}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recvName} numberOfLines={1}>
                      {inv.patientName}
                    </Text>
                    <Text style={styles.recvMeta} numberOfLines={1}>
                      {inv.title} • {inv.invoiceNo}
                      {inv.dateISO ? ` • ${relativeDayLabel(inv.dateISO)}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.recvAmount}>{formatCurrency(inv.amount)}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ))
            )}
          </View>
        </FadeInView>

        <FadeInView delay={380}>
          <Button
            title="View Full Report"
            onPress={openReport}
            fullWidth
            size="lg"
            icon={<Ionicons name="document-text-outline" size={20} color="#FFFFFF" />}
            style={styles.reportBtn}
          />
        </FadeInView>
      </ScrollView>
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
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.base,
  },
  totalCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  totalLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  totalLabel: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.semiBold,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.text,
    marginVertical: 4,
    letterSpacing: -0.5,
  },
  growth: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successLight,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  growthDown: {
    backgroundColor: colors.dangerLight,
  },
  growthText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.success,
  },
  periodTabs: {
    marginTop: spacing.base,
    marginHorizontal: -spacing.base,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
  },
  cell: {
    width: '48.3%',
  },
  cellWide: {
    width: '100%',
  },
  catCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  catHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  catLabel: {
    flex: 1,
    fontSize: 11.5,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.semiBold,
  },
  catIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catValue: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.text,
    marginTop: 6,
  },
  catSub: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  catBar: {
    marginTop: spacing.sm,
  },
  reconcile: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.base,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardTitle: {
    flex: 1,
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  cardMeta: {
    fontSize: typography.fontSizes.xs,
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  modeRowGap: {
    marginTop: spacing.md,
  },
  modeIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modeLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  modeValue: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  modePct: {
    color: colors.textMuted,
    fontWeight: typography.fontWeights.medium,
  },
  footnote: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.md,
    lineHeight: 16,
  },
  emptyText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    paddingVertical: spacing.sm,
  },
  recvHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  recvLabel: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.semiBold,
  },
  recvTotal: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.warningText,
  },
  recvIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingVertical: spacing.sm,
  },
  recvName: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  recvMeta: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  recvAmount: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  reportBtn: {
    marginTop: spacing.lg,
  },
});
