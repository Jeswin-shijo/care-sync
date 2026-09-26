import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { REPORT_DEFINITIONS, type ReportDefinition } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { buildReport } from '../logic/reports';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { FilterTabs } from '../components/common/FilterTabs';
import { FadeInView, PressableScale, PulseDot, stagger } from '../components/common/Motion';
import { pushOrPopTo } from '../components/finance/financeNavigation';
import type { IconName } from '../components/finance/invoiceUtils';
import { formatClock } from '../utils/dates';

const CATEGORIES: ReportDefinition['category'][] = ['Financial', 'Patient', 'Operational'];

export default function ReportsRoute() {
  const app = useApp();
  const params = useLocalSearchParams<{ category?: string }>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<ReportDefinition['category']>(
    () => CATEGORIES.find((c) => c.toLowerCase() === String(params.category ?? '').toLowerCase()) ?? 'Financial'
  );

  const list = REPORT_DEFINITIONS.filter((d) => d.category === tab);

  // One live headline per report (first KPI), recomputed when the records change.
  const headlines = useMemo(() => {
    const out: Record<string, string> = {};
    list.forEach((d) => {
      const kpi = buildReport(d.id, app)?.kpis[0];
      if (kpi) out[d.id] = `${kpi.label}: ${kpi.value}`;
    });
    return out;
  }, [
    tab,
    app.invoices,
    app.patients,
    app.appointments,
    app.labSamples,
    app.radiologyOrders,
    app.wardInfo,
    app.medicines,
    app.supplies,
    app.dischargeSummaries,
    app.visits,
    app.nurseTasks,
    app.doctors,
  ]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header
        title="Reports"
        subtitle="Live from hospital records"
        showBack
        rightAction={
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => pushOrPopTo(navigation.getState(), 'financial-management', '/financial-management')}
            accessibilityRole="button"
            accessibilityLabel="Open financial management"
            hitSlop={6}
          >
            <Ionicons name="stats-chart-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <FilterTabs
        tabs={CATEGORIES}
        activeTab={tab}
        onSelectTab={(t) => setTab(t as ReportDefinition['category'])}
        scrollable={false}
        style={styles.tabs}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        <View style={styles.live}>
          <PulseDot size={7} />
          <Text style={styles.liveText}>
            {list.length} {tab.toLowerCase()} reports • generated live as of {formatClock()}
          </Text>
        </View>

        <View style={styles.list}>
          {list.map((d, i) => (
            <FadeInView key={`${tab}-${d.id}`} delay={stagger(i, 50)}>
              <PressableScale
                style={styles.card}
                onPress={() => router.push({ pathname: '/report/[id]', params: { id: d.id } })}
                accessibilityRole="button"
                accessibilityLabel={`${d.title}. ${d.subtitle}. ${headlines[d.id] ?? ''}`}
              >
                <View style={[styles.icon, { backgroundColor: d.color + '16' }]}>
                  <Ionicons name={d.icon as IconName} size={22} color={d.color} />
                </View>
                <View style={styles.body}>
                  <Text style={styles.title} numberOfLines={1}>
                    {d.title}
                  </Text>
                  <Text style={styles.subtitle} numberOfLines={2}>
                    {d.subtitle}
                  </Text>
                  {!!headlines[d.id] && (
                    <Text style={[styles.headline, { color: d.color }]} numberOfLines={1}>
                      {headlines[d.id]}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </PressableScale>
            </FadeInView>
          ))}
        </View>

        <Text style={styles.footnote}>Open a report to see the full table, then export it as PDF, share it or print it.</Text>
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
  tabs: {
    marginTop: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.base,
  },
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  liveText: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  list: {
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.md,
    minHeight: 76,
    ...shadows.sm,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 1,
  },
  headline: {
    fontSize: 11.5,
    fontWeight: typography.fontWeights.bold,
    marginTop: 4,
  },
  footnote: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 17,
  },
});
