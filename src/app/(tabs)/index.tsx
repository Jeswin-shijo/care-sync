import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';
import { HOSPITAL_CONFIG } from '../../constants/config';
import { Avatar } from '../../components/common/Avatar';
import { Badge } from '../../components/common/Badge';
import { formatCurrency } from '../../utils/formatters';

export default function DashboardRoute() {
  const { appointments, todayStats, notifications, setSelectedPatient, patients } = useApp();

  const unreadCount = notifications.filter((n) => !n.read).length;
  const upcomingAppointments = appointments.slice(0, 3);

  const quickActions = [
    {
      id: 'book',
      label: 'Book\nAppointment',
      icon: 'calendar' as const,
      color: '#1E6BFF',
      bg: '#EFF6FF',
      onPress: () => router.push('/book-appointment'),
    },
    {
      id: 'register',
      label: 'Register\nPatient',
      icon: 'person-add' as const,
      color: '#10B981',
      bg: '#ECFDF5',
      onPress: () => router.push('/register-patient'),
    },
    {
      id: 'admission',
      label: 'Add\nAdmission',
      icon: 'bed' as const,
      color: '#8B5CF6',
      bg: '#F5F3FF',
      onPress: () => router.push('/ipd-admission'),
    },
    {
      id: 'receipt',
      label: 'Generate\nReceipt',
      icon: 'receipt' as const,
      color: '#F59E0B',
      bg: '#FFFBEB',
      onPress: () => router.push('/receipt-templates'),
    },
    {
      id: 'pharmacy',
      label: 'Pharmacy',
      icon: 'medkit' as const,
      color: '#0D9488',
      bg: '#F0FDFA',
      onPress: () => router.push('/pharmacy'),
    },
    {
      id: 'lab',
      label: 'Lab',
      icon: 'flask' as const,
      color: '#EC4899',
      bg: '#FDF2F8',
      onPress: () => router.push('/lab'),
    },
    {
      id: 'radiology',
      label: 'Radiology',
      icon: 'scan' as const,
      color: '#6366F1',
      bg: '#EEF2FF',
      onPress: () => router.push('/radiology'),
    },
    {
      id: 'more',
      label: 'More',
      icon: 'grid' as const,
      color: '#64748B',
      bg: '#F1F5F9',
      onPress: () => router.push('/(tabs)/more'),
    },
  ];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.profileRow}>
            <Avatar name={HOSPITAL_CONFIG.doctorName} size={46} showStatus />
            <View style={styles.profileTextContainer}>
              <Text style={styles.greetingText}>Good Morning,</Text>
              <Text style={styles.doctorNameText}>{HOSPITAL_CONFIG.doctorName}</Text>
              <Text style={styles.doctorRoleText}>{HOSPITAL_CONFIG.doctorRole}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={() => router.push('/notifications')}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
            {unreadCount > 0 && <View style={styles.notifBadge} />}
          </TouchableOpacity>
        </View>

        {/* Hospital Glance Banner Card */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push('/financial-management')}
        >
          <LinearGradient
            colors={['#1E6BFF', '#2563EB', '#1D4ED8']}
            style={styles.bannerCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.bannerContent}>
              <View style={styles.bannerHospitalIcon}>
                <Ionicons name="business" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.bannerTexts}>
                <Text style={styles.bannerTitle}>{HOSPITAL_CONFIG.name}</Text>
                <Text style={styles.bannerSubtitle}>{HOSPITAL_CONFIG.tagline}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Today's Summary Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Summary</Text>
          <TouchableOpacity onPress={() => router.push('/financial-management')}>
            <Text style={styles.viewDetailsText}>Analytics ›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          {/* Total Patients */}
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Total Patients</Text>
              <View style={[styles.statIconBadge, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="people" size={14} color="#1E6BFF" />
              </View>
            </View>
            <Text style={styles.statNumber}>{todayStats.totalPatients.toLocaleString()}</Text>
            <View style={styles.trendRow}>
              <Ionicons name="arrow-up" size={12} color={colors.success} />
              <Text style={styles.trendGreen}>+12%</Text>
              <Text style={styles.trendSub}>vs last week</Text>
            </View>
          </View>

          {/* OPD Today */}
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>OPD Today</Text>
              <View style={[styles.statIconBadge, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="fitness" size={14} color="#10B981" />
              </View>
            </View>
            <Text style={styles.statNumber}>{todayStats.opdToday}</Text>
            <View style={styles.trendRow}>
              <Ionicons name="arrow-up" size={12} color={colors.success} />
              <Text style={styles.trendGreen}>+8%</Text>
              <Text style={styles.trendSub}>today</Text>
            </View>
          </View>

          {/* IPD Occupancy */}
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>IPD Occupancy</Text>
              <View style={[styles.statIconBadge, { backgroundColor: '#F5F3FF' }]}>
                <Ionicons name="bed" size={14} color="#8B5CF6" />
              </View>
            </View>
            <Text style={styles.statNumber}>{todayStats.ipdOccupancy}%</Text>
            <Text style={styles.statSubDetail}>18/30 beds occupied</Text>
          </View>

          {/* Revenue Today */}
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Revenue Today</Text>
              <View style={[styles.statIconBadge, { backgroundColor: '#FFFBEB' }]}>
                <Ionicons name="cash" size={14} color="#F59E0B" />
              </View>
            </View>
            <Text style={styles.statNumber}>{formatCurrency(todayStats.todayCollection)}</Text>
            <View style={styles.trendRow}>
              <Ionicons name="arrow-up" size={12} color={colors.success} />
              <Text style={styles.trendGreen}>+15%</Text>
              <Text style={styles.trendSub}>today</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>

        <View style={styles.quickActionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionItem}
              onPress={action.onPress}
              activeOpacity={0.75}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: action.bg }]}>
                <Ionicons name={action.icon} size={22} color={action.color} />
              </View>
              <Text style={styles.actionLabel} numberOfLines={2}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Upcoming Appointments */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
          <TouchableOpacity onPress={() => router.push('/appointments')}>
            <Text style={styles.viewAllText}>View All ›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.appointmentsList}>
          {upcomingAppointments.map((apt) => {
            const patient = patients.find((p) => p.id === apt.patientId);
            return (
              <TouchableOpacity
                key={apt.id}
                style={styles.appointmentCard}
                activeOpacity={0.8}
                onPress={() => {
                  if (patient) {
                    setSelectedPatient(patient);
                    router.push({
                      pathname: '/patient/[id]',
                      params: { id: patient.id },
                    });
                  }
                }}
              >
                <View style={styles.aptTimeBadge}>
                  <Text style={styles.aptTimeText}>{apt.time}</Text>
                </View>

                <Avatar name={apt.patientName} size={38} />

                <View style={styles.aptInfo}>
                  <Text style={styles.aptPatientName}>{apt.patientName}</Text>
                  <Text style={styles.aptDeptText}>
                    {apt.department} • {apt.type}
                  </Text>
                </View>

                <Badge
                  label={apt.status}
                  variant={
                    apt.status === 'Confirmed'
                      ? 'confirmed'
                      : apt.status === 'Waiting'
                      ? 'waiting'
                      : 'notArrived'
                  }
                  size="sm"
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  profileTextContainer: {},
  greetingText: {
    fontSize: typography.fontSizes.xs,
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
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...shadows.sm,
  },
  notifBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  bannerCard: {
    borderRadius: radius.lg,
    padding: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.base,
    ...shadows.md,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  bannerHospitalIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTexts: {},
  bannerTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: '#FFFFFF',
  },
  bannerSubtitle: {
    fontSize: typography.fontSizes.xs,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.md + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  viewDetailsText: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.primary,
    fontWeight: typography.fontWeights.semiBold,
  },
  viewAllText: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.primary,
    fontWeight: typography.fontWeights.semiBold,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '47.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  statIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginVertical: 2,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  trendGreen: {
    fontSize: typography.fontSizes.xs - 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.success,
  },
  trendSub: {
    fontSize: typography.fontSizes.xs - 1,
    color: colors.textMuted,
    marginLeft: 2,
  },
  statSubDetail: {
    fontSize: typography.fontSizes.xs - 1,
    color: colors.textMuted,
    marginTop: 4,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  actionItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  actionIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 11,
    color: colors.text,
    textAlign: 'center',
    fontWeight: typography.fontWeights.medium,
    lineHeight: 14,
  },
  appointmentsList: {
    gap: spacing.sm,
  },
  appointmentCard: {
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
});
