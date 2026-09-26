import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useApp } from '../context/AppContext';
import type { RevenuePeriod, StaffMember } from '../data/mockData';
import { ROLE_ACTOR } from '../logic/hospital';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { SectionHeader } from '../components/common/SectionHeader';
import { StatCard } from '../components/common/StatCard';
import { AnimatedNumber, FadeInView, PressableScale, PulseDot, stagger } from '../components/common/Motion';
import { AuditTrailList } from '../components/shell/AuditTrailList';
import { BarRow, occupancyTone, PendingActionRow } from '../components/shell/AdminBlocks';
import { SegmentedControl } from '../components/shell/Controls';
import { ModuleTile } from '../components/shell/ModuleTile';
import { RevenueChart } from '../components/shell/RevenueChart';
import { useScrollBottomPadding } from '../components/shell/layout';
import { useNow } from '../components/shell/time';
import { formatCompactCurrency, formatCurrency } from '../utils/formatters';
import { formatClock } from '../utils/dates';
import { goToTab } from '../utils/navigation';

const PERIODS: Array<{ key: RevenuePeriod; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
];

const STAFF_ROLES: Array<{ role: StaffMember['role']; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = [
  { role: 'Doctor', label: 'Doctors', icon: 'medical', color: '#1E6BFF', bg: '#EFF6FF' },
  { role: 'Nurse', label: 'Nurses', icon: 'fitness', color: '#059669', bg: '#ECFDF5' },
  { role: 'Lab Technician', label: 'Lab', icon: 'flask', color: '#7C3AED', bg: '#F5F3FF' },
  { role: 'Pharmacist', label: 'Pharmacy', icon: 'medkit', color: '#D97706', bg: '#FFFBEB' },
  { role: 'Administrator', label: 'Admin', icon: 'briefcase', color: '#0284C7', bg: '#F0F9FF' },
  { role: 'Receptionist', label: 'Front desk', icon: 'people', color: '#EC4899', bg: '#FDF2F8' },
];

const MIX = [
  { key: 'opd', label: 'OPD', color: '#1E6BFF' },
  { key: 'ipd', label: 'IPD', color: '#8B5CF6' },
  { key: 'pharmacy', label: 'Pharmacy', color: '#F59E0B' },
  { key: 'diagnostics', label: 'Diagnostics', color: '#10B981' },
] as const;

export default function AdminPortalRoute() {
  const {
    setActiveRole,
    todayStats,
    bedSummary,
    wardInfo,
    departments,
    staff,
    prescriptionReviews,
    labPipeline,
    auditLog,
    supplies,
    bloodStock,
    getRevenue,
    hospitalProfile,
  } = useApp();

  // Re-asserted on every focus, so returning to this portal restores its role.
  useFocusEffect(
    useCallback(() => {
      setActiveRole('admin');
    }, [setActiveRole])
  );

  const now = useNow(30000);
  const bottomPad = useScrollBottomPadding();
  const [period, setPeriod] = useState<RevenuePeriod>('today');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [updatedAt, setUpdatedAt] = useState(() => formatClock());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    timer.current = setTimeout(() => {
      setUpdatedAt(formatClock());
      setRefreshKey((k) => k + 1);
      setRefreshing(false);
    }, 800);
  }, []);

  const revenue = getRevenue(period);
  const todayRevenue = getRevenue('today');
  const mixTotal = MIX.reduce((n, m) => n + revenue[m.key].amount, 0) || 1;

  const deptLoad = useMemo(() => [...departments].filter((d) => d.opdToday > 0).sort((a, b) => b.opdToday - a.opdToday).slice(0, 6), [departments]);
  const maxDept = Math.max(1, ...deptLoad.map((d) => d.opdToday));

  const staffCounts = useMemo(
    () =>
      STAFF_ROLES.map((r) => {
        const members = staff.filter((s) => s.role === r.role);
        return { ...r, total: members.length, onDuty: members.filter((s) => s.status === 'On Duty').length };
      }).filter((r) => r.total > 0),
    [staff]
  );
  const onDutyTotal = staffCounts.reduce((n, r) => n + r.onDuty, 0);

  const flaggedRx = prescriptionReviews.filter((r) => r.status === 'Pending Review' && r.safetyStatus !== 'Safe').length;
  const reorder = supplies.filter((s) => s.stock < s.reorderLevel).length;
  const lowBlood = bloodStock.filter((b) => b.prbc < 5).map((b) => b.group);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header
        title="Hospital Overview"
        subtitle={`Admin Portal • ${hospitalProfile.name}`}
        showBack
        rightAction={
          <PressableScale
            onPress={() => router.push('/reports')}
            style={styles.headerBtn}
            scaleTo={0.9}
            accessibilityRole="button"
            accessibilityLabel="Open reports"
          >
            <Ionicons name="bar-chart-outline" size={20} color={colors.primary} />
          </PressableScale>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <FadeInView>
          <View style={styles.liveRow}>
            <View style={styles.rolePill}>
              <Ionicons name="shield-checkmark" size={13} color="#0284C7" />
              <Text style={styles.rolePillText}>Administrator • {ROLE_ACTOR.admin}</Text>
            </View>
            <View style={styles.liveInfo}>
              <PulseDot color={colors.success} size={6} />
              <Text style={styles.liveText}>Live • {updatedAt}</Text>
            </View>
          </View>
        </FadeInView>

        {/* KPIs */}
        <FadeInView delay={stagger(1)}>
          <View key={refreshKey} style={styles.kpiGrid}>
            <View style={styles.kpiRow}>
              <StatCard
                title="Patients today"
                value={todayStats.footfallToday}
                subtext="OPD + ER + in-patients"
                icon="people"
                iconColor="#1E6BFF"
                iconBgColor="#EFF6FF"
                onPress={() => goToTab('patients')}
              />
              <StatCard
                title="Admissions"
                value={todayStats.admissionsToday}
                subtext="today"
                icon="enter"
                iconColor="#8B5CF6"
                iconBgColor="#F5F3FF"
                delay={80}
                onPress={() => router.push('/bed-management')}
              />
            </View>
            <View style={styles.kpiRow}>
              <StatCard
                title="Discharges"
                value={todayStats.dischargesToday}
                subtext="today"
                icon="exit"
                iconColor="#059669"
                iconBgColor="#ECFDF5"
                delay={160}
                onPress={() => router.push('/discharge-summary')}
              />
              <StatCard
                title="Revenue"
                value={todayStats.todayCollection}
                format={formatCompactCurrency}
                change={`${todayRevenue.growthPct >= 0 ? '+' : ''}${todayRevenue.growthPct}%`}
                subtext={todayRevenue.comparedTo}
                icon="cash"
                iconColor="#F59E0B"
                iconBgColor="#FFFBEB"
                delay={240}
                onPress={() => router.push('/financial-management')}
              />
            </View>
          </View>
        </FadeInView>

        {/* Revenue */}
        <FadeInView delay={stagger(2)}>
          <SectionHeader title="Revenue" actionLabel="Financials" onActionPress={() => router.push('/financial-management')} />
          <View style={styles.card}>
            <SegmentedControl options={PERIODS} value={period} onChange={setPeriod} />
            <View style={styles.revenueTop}>
              <AnimatedNumber key={period} value={revenue.total} format={(n) => formatCurrency(n)} style={styles.revenueTotal} />
              <View style={[styles.growth, revenue.growthPct < 0 && styles.growthDown]}>
                <Ionicons name={revenue.growthPct < 0 ? 'arrow-down' : 'arrow-up'} size={12} color={revenue.growthPct < 0 ? colors.danger : colors.success} />
                <Text style={[styles.growthText, revenue.growthPct < 0 && { color: colors.danger }]}>
                  {Math.abs(revenue.growthPct)}% {revenue.comparedTo}
                </Text>
              </View>
            </View>
            <RevenueChart key={period} data={revenue.chart} />
            <View style={styles.mixBar}>
              {MIX.map((m) => (
                <View key={m.key} style={{ flex: Math.max(0.001, revenue[m.key].amount / mixTotal), backgroundColor: m.color }} />
              ))}
            </View>
            <View style={styles.mixLegend}>
              {MIX.map((m) => (
                <View key={m.key} style={styles.mixItem}>
                  <View style={[styles.mixDot, { backgroundColor: m.color }]} />
                  <Text style={styles.mixLabel}>{m.label}</Text>
                  <Text style={styles.mixValue}>{formatCompactCurrency(revenue[m.key].amount)}</Text>
                </View>
              ))}
            </View>
          </View>
        </FadeInView>

        {/* Needs attention */}
        <FadeInView delay={stagger(3)}>
          <SectionHeader title="Pending actions" />
          <View style={styles.cardList}>
            <PendingActionRow
              icon="receipt"
              title="Pending bills"
              detail={`${formatCurrency(todayStats.pendingAmount)} awaiting collection`}
              count={String(todayStats.pendingCount)}
              tone={todayStats.pendingCount ? 'warning' : 'success'}
              onPress={() => router.navigate({ pathname: '/(tabs)/billing', params: { filter: 'Pending' } })}
            />
            <PendingActionRow
              divider
              icon="medkit"
              title="Flagged prescriptions"
              detail={flaggedRx ? 'Interaction or allergy warnings waiting for pharmacist review' : 'No unsafe prescriptions waiting'}
              count={String(flaggedRx)}
              tone={flaggedRx ? 'danger' : 'success'}
              onPress={() => router.push('/pharmacy-review')}
            />
            <PendingActionRow
              divider
              icon="flask"
              title="Abnormal labs today"
              detail={`${labPipeline.New} new • ${labPipeline.Processing} processing • ${labPipeline.Completed} completed`}
              count={String(labPipeline.Abnormal)}
              tone={labPipeline.Abnormal ? 'danger' : 'success'}
              onPress={() => router.push('/lab-portal')}
            />
            <PendingActionRow
              divider
              icon="pulse"
              title="ICU availability"
              detail={bedSummary.icuAvailable ? `${bedSummary.icuAvailable} of ${bedSummary.icuTotal} ICU beds free` : 'ICU is full — plan transfers or step-downs'}
              count={`${bedSummary.icuAvailable}/${bedSummary.icuTotal}`}
              tone={bedSummary.icuAvailable === 0 ? 'danger' : bedSummary.icuAvailable <= 2 ? 'warning' : 'success'}
              onPress={() => router.push({ pathname: '/bed-management', params: { ward: 'ward-icu' } })}
            />
            <PendingActionRow
              divider
              icon="cube"
              title="Supplies to reorder"
              detail={reorder ? 'Items below reorder level in central stores' : 'All supplies above reorder level'}
              count={String(reorder)}
              tone={reorder ? 'warning' : 'success'}
              onPress={() => router.push('/inventory')}
            />
            <PendingActionRow
              divider
              icon="water"
              title="Blood stock"
              detail={lowBlood.length ? `Low PRBC units: ${lowBlood.join(', ')}` : 'All groups above minimum'}
              count={String(lowBlood.length)}
              tone={lowBlood.includes('O-') ? 'danger' : lowBlood.length ? 'warning' : 'success'}
              onPress={() => router.push('/blood-bank')}
            />
          </View>
        </FadeInView>

        {/* Beds by ward */}
        <FadeInView delay={stagger(4)}>
          <SectionHeader
            title="Bed occupancy"
            meta={`${bedSummary.pct}% • ${bedSummary.available} free`}
            actionLabel="Beds"
            onActionPress={() => router.push('/bed-management')}
          />
          <View style={styles.card}>
            {wardInfo.map((w, i) => {
              const pct = w.totalBeds ? Math.round((w.occupied / w.totalBeds) * 100) : 0;
              return (
                <BarRow
                  key={w.id}
                  divider={i > 0}
                  label={w.name}
                  value={`${w.occupied}/${w.totalBeds} • ${pct}%`}
                  sub={`${w.available} bed${w.available === 1 ? '' : 's'} available`}
                  progress={w.totalBeds ? w.occupied / w.totalBeds : 0}
                  color={occupancyTone(pct)}
                  delay={stagger(i, 80)}
                  onPress={() => router.push({ pathname: '/bed-management', params: { ward: w.id } })}
                />
              );
            })}
          </View>
        </FadeInView>

        {/* Department load */}
        <FadeInView delay={stagger(5)}>
          <SectionHeader title="Department load" meta="OPD today" actionLabel="Departments" onActionPress={() => router.push('/settings/departments')} />
          <View style={styles.card}>
            {deptLoad.map((d, i) => (
              <BarRow
                key={d.id}
                divider={i > 0}
                label={d.name}
                value={`${d.opdToday} patients`}
                progress={d.opdToday / maxDept}
                color={d.color}
                delay={stagger(i, 70)}
              />
            ))}
          </View>
        </FadeInView>

        {/* Staff on duty */}
        <FadeInView delay={stagger(6)}>
          <SectionHeader title="Staff on duty" meta={`${onDutyTotal}/${staff.length}`} actionLabel="Users & Roles" onActionPress={() => router.push('/settings/users-roles')} />
          <View style={styles.staffGrid}>
            {staffCounts.map((r) => (
              <PressableScale
                key={r.role}
                onPress={() => router.push('/settings/users-roles')}
                scaleTo={0.95}
                style={styles.staffCell}
                accessibilityRole="button"
                accessibilityLabel={`${r.label}: ${r.onDuty} of ${r.total} on duty`}
              >
                <View style={[styles.staffIcon, { backgroundColor: r.bg }]}>
                  <Ionicons name={r.icon} size={16} color={r.color} />
                </View>
                <Text style={styles.staffValue}>
                  {r.onDuty}
                  <Text style={styles.staffTotal}>/{r.total}</Text>
                </Text>
                <Text style={styles.staffLabel} numberOfLines={1}>
                  {r.label}
                </Text>
              </PressableScale>
            ))}
          </View>
        </FadeInView>

        {/* Audit trail */}
        <FadeInView delay={stagger(7)}>
          <SectionHeader title="Audit trail" meta={`Latest ${Math.min(12, auditLog.length)} of ${auditLog.length}`} actionLabel="Security" onActionPress={() => router.push('/settings/security')} />
          <View style={[styles.card, styles.auditCard]}>
            <AuditTrailList entries={auditLog} now={now} limit={12} />
          </View>
        </FadeInView>

        {/* Quick links */}
        <FadeInView delay={stagger(8)}>
          <SectionHeader title="Quick links" />
          <View style={styles.linksCard}>
            <ModuleTile title="Reports" icon="bar-chart" color="#F97316" bg="#FFF1E6" onPress={() => router.push('/reports')} />
            <ModuleTile title="Financial Management" icon="trending-up" color="#059669" bg="#E7F8F1" onPress={() => router.push('/financial-management')} />
            <ModuleTile title="Users & Roles" icon="people" color="#6366F1" bg="#EEF2FF" onPress={() => router.push('/settings/users-roles')} />
            <ModuleTile title="Settings" icon="settings" color="#475569" bg="#EEF2F6" onPress={() => router.push('/settings')} />
          </View>
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
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0F9FF',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  rolePillText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: '#0369A1',
  },
  liveInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.semiBold,
  },
  kpiGrid: {
    gap: spacing.md,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardList: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  auditCard: {
    paddingVertical: spacing.xs,
  },
  revenueTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  revenueTotal: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.text,
    letterSpacing: -0.5,
  },
  growth: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.successLight,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  growthDown: {
    backgroundColor: colors.dangerLight,
  },
  growthText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: '#047857',
  },
  mixBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: spacing.md,
    gap: 2,
  },
  mixLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    rowGap: 6,
  },
  mixItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mixDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mixLabel: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
  },
  mixValue: {
    fontSize: typography.fontSizes.xs + 0.5,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  staffGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  staffCell: {
    width: '33.333%',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  staffIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  staffValue: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  staffTotal: {
    fontSize: typography.fontSizes.sm,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.semiBold,
  },
  staffLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  linksCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
});
