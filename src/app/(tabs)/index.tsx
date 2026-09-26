import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '../../context/AppContext';
import type { Appointment } from '../../data/mockData';
import type { AiAlert } from '../../logic/clinical';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';
import { HOSPITAL_CONFIG } from '../../constants/config';
import { Header } from '../../components/common/Header';
import { Avatar } from '../../components/common/Avatar';
import { Badge, statusVariant } from '../../components/common/Badge';
import { RoleSwitcher } from '../../components/common/RoleSwitcher';
import { StatCard } from '../../components/common/StatCard';
import { SectionHeader } from '../../components/common/SectionHeader';
import { BottomSheet } from '../../components/common/BottomSheet';
import { EmptyState } from '../../components/common/EmptyState';
import { FadeInView, PressableScale, ProgressFill, PulseDot, stagger } from '../../components/common/Motion';
import { AiAlertRow } from '../../components/shell/AiAlertRow';
import { localizedGreeting } from '../../components/shell/settings/LanguageSection';
import { formatCurrency } from '../../utils/formatters';
import { formatClock, greetingForNow, todayISO } from '../../utils/dates';
import { goToTab, openRoute, TabName } from '../../utils/navigation';

type IconName = keyof typeof Ionicons.glyphMap;

interface QuickAction {
  id: string;
  label: string;
  icon: IconName;
  color: string;
  bg: string;
  route?: string;
  tab?: TabName;
}

/** Design v2 quick-action set. */
const QUICK_ACTIONS: QuickAction[] = [
  { id: 'new-patient', label: 'New Patient', icon: 'person-add', color: '#1E6BFF', bg: '#E8F1FF', route: '/register-patient' },
  { id: 'appointments', label: 'Appointments', icon: 'calendar', color: '#8B5CF6', bg: '#F3EEFF', route: '/appointments' },
  { id: 'opd', label: 'OPD', icon: 'medical', color: '#10B981', bg: '#E7F8F1', route: '/opd-consultation' },
  { id: 'ipd', label: 'IPD', icon: 'bed', color: '#F59E0B', bg: '#FFF4E0', route: '/ipd-admission' },
  { id: 'lab', label: 'Lab', icon: 'flask', color: '#7C3AED', bg: '#F1EBFF', route: '/lab' },
  { id: 'pharmacy', label: 'Pharmacy', icon: 'medkit', color: '#EF4444', bg: '#FDECEC', route: '/pharmacy' },
  { id: 'radiology', label: 'Radiology', icon: 'scan', color: '#0284C7', bg: '#E6F4FB', route: '/radiology' },
  { id: 'more', label: 'More', icon: 'ellipsis-horizontal', color: '#1E6BFF', bg: '#EAF1FB', tab: 'more' },
];

const occupancyColor = (pct: number) => (pct >= 90 ? colors.danger : pct >= 75 ? colors.warning : colors.success);

export default function DashboardRoute() {
  const {
    todayStats,
    bedSummary,
    aiAlerts,
    appointments,
    upcomingAppointments,
    unreadCount,
    settings,
    hospitalProfile,
    getRevenue,
    getPatient,
    setSelectedPatientId,
  } = useApp();

  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(() => formatClock());
  const [refreshKey, setRefreshKey] = useState(0);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    later(() => {
      setUpdatedAt(formatClock());
      setRefreshKey((k) => k + 1);
      setRefreshing(false);
    }, 800);
  }, []);

  const revenue = getRevenue('today');
  const topAlerts = aiAlerts.slice(0, 3);
  const criticalCount = aiAlerts.filter((a) => a.severity === 'critical').length;
  const remainingToday = useMemo(() => {
    const t = todayISO();
    return appointments.filter((a) => a.date === t && a.status !== 'Completed' && a.status !== 'Cancelled').length;
  }, [appointments]);

  const openQuickAction = (a: QuickAction) => {
    if (a.tab) goToTab(a.tab);
    else if (a.route) router.push(a.route as any);
  };

  const openAlertFromSheet = (a: AiAlert) => {
    setAlertsOpen(false);
    // Let the sheet slide away before the next screen is pushed.
    later(() => openRoute(a.route, a.params), 260);
  };

  const openAppointment = (apt: Appointment) => {
    if (getPatient(apt.patientId)) {
      setSelectedPatientId(apt.patientId);
      router.push({ pathname: '/patient/[id]', params: { id: apt.patientId } });
    } else {
      router.push('/appointments');
    }
  };

  const growth = `${revenue.growthPct >= 0 ? '+' : ''}${revenue.growthPct}%`;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header
        showBack={false}
        titleComponent={
          <View style={styles.profileRow}>
            <Avatar name={HOSPITAL_CONFIG.doctorName} size={44} showStatus />
            <View style={styles.profileText}>
              <Text style={styles.greetingText}>{localizedGreeting(settings.language) ?? greetingForNow()},</Text>
              <Text style={styles.doctorNameText} numberOfLines={1}>
                {HOSPITAL_CONFIG.doctorName}
              </Text>
              <Text style={styles.doctorRoleText} numberOfLines={1}>
                {HOSPITAL_CONFIG.doctorRole}
              </Text>
            </View>
          </View>
        }
        rightAction={
          <PressableScale
            onPress={() => router.push('/notifications')}
            style={styles.bellBtn}
            scaleTo={0.9}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Notifications${settings.notificationsEnabled ? '' : ', paused'}${unreadCount ? `, ${unreadCount} unread` : ', all caught up'}`}
          >
            <Ionicons
              name={!settings.notificationsEnabled ? 'notifications-off-outline' : unreadCount ? 'notifications' : 'notifications-outline'}
              size={22}
              color={settings.notificationsEnabled ? colors.text : colors.textMuted}
            />
            {unreadCount > 0 && (
              <View style={[styles.bellBadge, !settings.notificationsEnabled && styles.bellBadgeMuted]}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </PressableScale>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        {/* Hospital at a glance → Admin portal */}
        <FadeInView>
          <PressableScale
            onPress={() => router.push('/admin-portal')}
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel={`${hospitalProfile.name}. ${hospitalProfile.tagline}. Opens the hospital overview`}
          >
            <LinearGradient colors={['#EAF2FF', '#D6E6FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
              <LinearGradient colors={['#4F8BFF', colors.primary]} style={styles.bannerIcon}>
                <Ionicons name="business" size={22} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.bannerTexts}>
                <Text style={styles.bannerTitle} numberOfLines={2}>
                  {hospitalProfile.name}
                </Text>
                <Text style={styles.bannerSubtitle} numberOfLines={1}>
                  {hospitalProfile.tagline}
                </Text>
              </View>
              <View style={styles.livePill}>
                <PulseDot color={colors.success} size={6} />
                <Text style={styles.liveText}>Live</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </LinearGradient>
          </PressableScale>
        </FadeInView>

        {/* Today's summary */}
        <FadeInView delay={stagger(1)}>
          <SectionHeader title="Today's Summary" meta={`Updated ${updatedAt}`} />
          <View key={refreshKey} style={styles.kpiGrid}>
            <View style={styles.kpiRow}>
              <StatCard
                title="Total Patients"
                value={todayStats.totalPatients}
                change="+12%"
                subtext="vs last week"
                icon="people"
                iconColor="#1E6BFF"
                iconBgColor="#EFF6FF"
                onPress={() => goToTab('patients')}
              />
              <StatCard
                title="OPD Today"
                value={todayStats.opdToday}
                change="+8%"
                subtext="vs yesterday"
                icon="medical"
                iconColor="#10B981"
                iconBgColor="#ECFDF5"
                delay={80}
                onPress={() => router.push('/appointments')}
              />
            </View>
            <View style={styles.kpiRow}>
              <StatCard
                title="IPD Occupancy"
                value={bedSummary.pct}
                format={(n) => `${Math.round(n)}%`}
                subtext={`${bedSummary.occupied}/${bedSummary.total} beds occupied`}
                icon="bed"
                iconColor="#8B5CF6"
                iconBgColor="#F5F3FF"
                delay={160}
                onPress={() => router.push('/bed-management')}
              >
                <ProgressFill
                  progress={bedSummary.pct / 100}
                  color={occupancyColor(bedSummary.pct)}
                  height={5}
                  delay={200}
                  style={styles.occupancyBar}
                />
              </StatCard>
              <StatCard
                title="Revenue Today"
                value={todayStats.todayCollection}
                format={(n) => formatCurrency(n)}
                change={growth}
                subtext={revenue.comparedTo}
                icon="cash"
                iconColor="#F59E0B"
                iconBgColor="#FFFBEB"
                delay={240}
                onPress={() => router.push('/financial-management')}
              />
            </View>
          </View>
        </FadeInView>

        {/* Role portals — compact, below the KPIs */}
        <FadeInView delay={stagger(2)}>
          <RoleSwitcher style={styles.roleSwitcher} />
        </FadeInView>

        {/* Quick actions */}
        <FadeInView delay={stagger(3)}>
          <SectionHeader title="Quick Actions" />
          <View style={styles.quickGrid}>
            {QUICK_ACTIONS.map((a) => (
              <PressableScale
                key={a.id}
                style={styles.quickItem}
                scaleTo={0.9}
                onPress={() => openQuickAction(a)}
                accessibilityRole="button"
                accessibilityLabel={a.label}
              >
                <View style={[styles.quickIcon, { backgroundColor: a.bg }]}>
                  <Ionicons name={a.icon} size={22} color={a.color} />
                </View>
                <Text style={styles.quickLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                  {a.label}
                </Text>
              </PressableScale>
            ))}
          </View>
        </FadeInView>

        {/* MediOS AI alerts */}
        <FadeInView delay={stagger(4)}>
          <SectionHeader
            title="MediOS AI Alerts"
            meta={aiAlerts.length ? `${aiAlerts.length} active` : undefined}
            actionLabel={aiAlerts.length ? 'View all' : undefined}
            onActionPress={() => setAlertsOpen(true)}
          />
          <View style={styles.alertCard}>
            <View style={styles.alertStrip}>
              <PulseDot color={criticalCount ? colors.danger : colors.success} size={7} />
              <Text style={styles.alertStripText}>
                {criticalCount
                  ? `${criticalCount} critical ${criticalCount === 1 ? 'alert needs' : 'alerts need'} review`
                  : 'Monitoring labs, prescriptions, vitals & follow-ups'}
              </Text>
            </View>
            {topAlerts.length ? (
              topAlerts.map((a) => <AiAlertRow key={a.id} alert={a} divider onPress={() => openRoute(a.route, a.params)} />)
            ) : (
              <View style={styles.alertEmpty}>
                <Ionicons name="shield-checkmark" size={20} color={colors.success} />
                <Text style={styles.alertEmptyText}>No active alerts. MediOS AI will flag abnormal results, unsafe prescriptions and missed follow-ups here.</Text>
              </View>
            )}
          </View>
        </FadeInView>

        {/* Upcoming appointments */}
        <FadeInView delay={stagger(5)}>
          <SectionHeader
            title="Upcoming Appointments"
            meta={remainingToday ? `${remainingToday} today` : undefined}
            actionLabel="View All"
            onActionPress={() => router.push('/appointments')}
          />
          {upcomingAppointments.length ? (
            <View style={styles.aptList}>
              {upcomingAppointments.map((apt, i) => (
                <FadeInView key={apt.id} delay={stagger(i + 5)}>
                  <PressableScale
                    style={styles.aptCard}
                    scaleTo={0.98}
                    onPress={() => openAppointment(apt)}
                    accessibilityRole="button"
                    accessibilityLabel={`${apt.time}, ${apt.patientName}, ${apt.department}, ${apt.type}, ${apt.status}. Opens patient record`}
                  >
                    <View style={styles.aptTimeBadge}>
                      <Text style={styles.aptTimeText}>{apt.time}</Text>
                    </View>
                    <Avatar name={apt.patientName} size={38} />
                    <View style={styles.aptInfo}>
                      <Text style={styles.aptPatientName} numberOfLines={1}>
                        {apt.patientName}
                      </Text>
                      <Text style={styles.aptDeptText} numberOfLines={1}>
                        {apt.department} • {apt.type}
                      </Text>
                    </View>
                    <Badge label={apt.status} variant={statusVariant(apt.status)} size="sm" style={styles.aptBadge} />
                  </PressableScale>
                </FadeInView>
              ))}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <EmptyState
                icon="calendar-outline"
                title="No more appointments today"
                description="New bookings for today will appear here."
                actionTitle="Book Appointment"
                onActionPress={() => router.push('/book-appointment')}
              />
            </View>
          )}
        </FadeInView>
      </ScrollView>

      <BottomSheet
        visible={alertsOpen}
        onClose={() => setAlertsOpen(false)}
        title="MediOS AI Alerts"
        subtitle={`${aiAlerts.length} active • highest severity first`}
      >
        <View style={styles.sheetList}>
          {aiAlerts.map((a, i) => (
            <AiAlertRow key={a.id} alert={a} divider={i > 0} onPress={() => openAlertFromSheet(a)} />
          ))}
        </View>
        <View style={styles.guardrail}>
          <Ionicons name="shield-checkmark" size={14} color={colors.success} />
          <Text style={styles.guardrailText}>
            Decision support only. Every alert cites the record it came from — verify before acting.
          </Text>
        </View>
      </BottomSheet>
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
    paddingBottom: spacing.xxl,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  profileText: {
    flex: 1,
    minWidth: 0,
  },
  greetingText: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
  },
  doctorNameText: {
    fontSize: typography.fontSizes.md + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  doctorRoleText: {
    fontSize: typography.fontSizes.xs,
    color: colors.primary,
    fontWeight: typography.fontWeights.medium,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  bellBadge: {
    position: 'absolute',
    top: 4,
    right: 3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeMuted: {
    backgroundColor: colors.textMuted,
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md + 2,
    borderWidth: 1,
    borderColor: '#CFE0FF',
  },
  bannerIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTexts: {
    flex: 1,
    minWidth: 0,
  },
  bannerTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: '#0B2F6B',
  },
  bannerSubtitle: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  liveText: {
    fontSize: 10.5,
    fontWeight: typography.fontWeights.bold,
    color: '#047857',
  },
  kpiGrid: {
    gap: spacing.md,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  occupancyBar: {
    marginTop: 6,
  },
  roleSwitcher: {
    marginTop: spacing.lg,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  quickItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  quickIcon: {
    width: 54,
    height: 54,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickLabel: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.text,
    textAlign: 'center',
    fontWeight: typography.fontWeights.medium,
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    ...shadows.sm,
  },
  alertStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm + 2,
    backgroundColor: '#F8FAFF',
  },
  alertStripText: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
  },
  alertEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  alertEmptyText: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  aptList: {
    gap: spacing.sm,
  },
  aptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.md,
    ...shadows.sm,
  },
  aptTimeBadge: {
    backgroundColor: colors.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
  },
  aptTimeText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  aptInfo: {
    flex: 1,
    minWidth: 0,
  },
  aptPatientName: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  aptDeptText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  aptBadge: {
    alignSelf: 'center',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sheetList: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  guardrail: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: spacing.md,
  },
  guardrailText: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    lineHeight: 16,
  },
});
