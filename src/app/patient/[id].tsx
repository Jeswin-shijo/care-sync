import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { Avatar } from '../../components/common/Avatar';
import { Badge } from '../../components/common/Badge';

export default function PatientDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { patients, appointments, invoices } = useApp();

  const patient = patients.find((p) => p.id === id) || patients[0];

  const [activeTab, setActiveTab] = useState<'Overview' | 'Medical History' | 'Visits' | 'Reports'>('Overview');

  const patientAppointments = appointments.filter(
    (a) => a.patientId === patient?.id || a.patientName === patient?.name
  );
  const patientInvoices = invoices.filter(
    (i) => i.patientId === patient?.id || i.patientName === patient?.name
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Patient Details"
        showBack
        rightAction={
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Card Header */}
        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <Avatar name={patient.name} size={64} />
            <View style={styles.profileDetails}>
              <View style={styles.nameBadgeRow}>
                <Text style={styles.patientName}>{patient.name}</Text>
                <Badge
                  label={patient.status}
                  variant={
                    patient.status === 'Active'
                      ? 'active'
                      : patient.status === 'Admitted'
                      ? 'admitted'
                      : 'discharged'
                  }
                  size="sm"
                />
              </View>
              <Text style={styles.uhidText}>UHID: {patient.uhid}</Text>
              {patient.room && <Text style={styles.roomText}>{patient.room}</Text>}
            </View>
          </View>

          {/* Quick Demographics Badges */}
          <View style={styles.quickBadgesRow}>
            <View style={styles.demoBadge}>
              <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.demoBadgeText}>{patient.age} Years</Text>
            </View>
            <View style={styles.demoBadge}>
              <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.demoBadgeText}>{patient.gender}</Text>
            </View>
            <View style={styles.demoBadge}>
              <Ionicons name="call-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.demoBadgeText}>{patient.phone}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              router.push({
                pathname: '/opd-consultation',
                params: { patientId: patient.id },
              })
            }
          >
            <Ionicons name="medkit" size={18} color={colors.primary} />
            <Text style={styles.actionBtnText}>Consultation</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              router.push({
                pathname: '/ipd-admission',
                params: { patientId: patient.id },
              })
            }
          >
            <Ionicons name="bed" size={18} color="#8B5CF6" />
            <Text style={styles.actionBtnText}>Admit IPD</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              router.push({
                pathname: '/discharge-summary',
                params: { patientId: patient.id },
              })
            }
          >
            <Ionicons name="document-text" size={18} color="#10B981" />
            <Text style={styles.actionBtnText}>Summary</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          {(['Overview', 'Medical History', 'Visits', 'Reports'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tabItem, isActive && styles.tabItemActive]}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab Content */}
        {activeTab === 'Overview' && (
          <View style={styles.tabSection}>
            <View style={styles.infoSectionCard}>
              <Text style={styles.cardHeaderTitle}>Personal Information</Text>

              <View style={styles.infoRow}>
                <View style={styles.infoIconWrapper}>
                  <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Date of Birth</Text>
                  <Text style={styles.infoValue}>{patient.dob}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoIconWrapper}>
                  <Ionicons name="location-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Address</Text>
                  <Text style={styles.infoValue}>{patient.address}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoIconWrapper}>
                  <Ionicons name="water-outline" size={18} color={colors.danger} />
                </View>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Blood Group</Text>
                  <Text style={styles.infoValue}>{patient.bloodGroup}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoIconWrapper}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.success} />
                </View>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Insurance</Text>
                  <Text style={styles.infoValue}>{patient.insurance}</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoSectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.cardHeaderTitle}>Recent Visits</Text>
                <TouchableOpacity onPress={() => setActiveTab('Visits')}>
                  <Text style={styles.viewAllText}>View All ›</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.visitItem}>
                <View style={styles.visitIconCircle}>
                  <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.visitTitle}>OPD - General Medicine</Text>
                  <Text style={styles.visitSubtitle}>22 Sep 2025 • Dr. Priya Menon</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
            </View>
          </View>
        )}

        {activeTab === 'Medical History' && (
          <View style={styles.tabSection}>
            <View style={styles.infoSectionCard}>
              <Text style={styles.cardHeaderTitle}>Past Medical History</Text>
              <Text style={styles.historyParagraph}>
                • Hypertension diagnosed 2 years ago; well managed on regular medication.
              </Text>
              <Text style={styles.historyParagraph}>
                • No known drug allergies (NKDA).
              </Text>
              <Text style={styles.historyParagraph}>
                • Previous surgery: Appendectomy (2018), no postoperative complications.
              </Text>
            </View>
          </View>
        )}

        {activeTab === 'Visits' && (
          <View style={styles.tabSection}>
            <View style={styles.infoSectionCard}>
              <Text style={styles.cardHeaderTitle}>Consultations & Visits ({patientAppointments.length})</Text>
              {patientAppointments.map((apt) => (
                <View key={apt.id} style={styles.visitItem}>
                  <View style={styles.visitIconCircle}>
                    <Ionicons name="medkit-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.visitTitle}>{apt.department} ({apt.type})</Text>
                    <Text style={styles.visitSubtitle}>
                      {apt.date} • {apt.doctorName}
                    </Text>
                  </View>
                  <Badge label={apt.status} variant="confirmed" size="sm" />
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'Reports' && (
          <View style={styles.tabSection}>
            <View style={styles.infoSectionCard}>
              <Text style={styles.cardHeaderTitle}>Invoices & Bills ({patientInvoices.length})</Text>
              {patientInvoices.map((inv) => (
                <TouchableOpacity
                  key={inv.id}
                  style={styles.visitItem}
                  onPress={() =>
                    router.push({
                      pathname: '/receipt/[id]',
                      params: { id: inv.id },
                    })
                  }
                >
                  <View style={[styles.visitIconCircle, { backgroundColor: '#ECFDF5' }]}>
                    <Ionicons name="receipt-outline" size={18} color={colors.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.visitTitle}>{inv.title}</Text>
                    <Text style={styles.visitSubtitle}>
                      {inv.invoiceNo} • {inv.date}
                    </Text>
                  </View>
                  <Text style={styles.invoiceAmount}>₹{inv.amount.toLocaleString()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
    marginBottom: spacing.base,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  profileDetails: {
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  patientName: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  uhidText: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
    marginTop: 2,
  },
  roomText: {
    fontSize: typography.fontSizes.xs,
    color: colors.primary,
    fontWeight: typography.fontWeights.semiBold,
    marginTop: 2,
  },
  quickBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
  },
  demoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.cardMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  demoBadgeText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: 10,
    borderRadius: radius.md,
    ...shadows.sm,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  tabItemActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeights.bold,
  },
  tabSection: {
    gap: spacing.md,
  },
  infoSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardHeaderTitle: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  viewAllText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: typography.fontWeights.semiBold,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  infoIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: 2,
  },
  visitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  visitIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  visitSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  invoiceAmount: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  historyParagraph: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
});
