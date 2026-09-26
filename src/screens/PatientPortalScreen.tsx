import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '../context/AppContext';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { Badge } from '../components/common/Badge';

export const PatientPortalScreen: React.FC = () => {
  const { patientReminders, togglePatientReminder, patients, appointments, invoices } = useApp();

  const currentPatient = patients[0]; // Ananya S
  const patientAppointments = appointments.filter((a) => a.patientName === currentPatient.name);
  const patientInvoices = invoices.filter((i) => i.patientName === currentPatient.name);

  const handleHospitalNavigation = () => {
    Alert.alert(
      'CareSync Hospital Navigation',
      `Indoor Wayfinding Directions for ${currentPatient.name}:\n\n• General Medicine OPD: Block B, 2nd Floor, Room 201\n• Diagnostic Laboratory: Block A, Ground Floor, Wing 3\n• 24x7 In-House Pharmacy: Main Atrium, Ground Floor\n• Cashless Insurance Desk: Counter 4, Lobby\n\nFollow blue floor lines for OPD Clinic.`,
      [{ text: 'Close', style: 'cancel' }]
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header
        title="MediOS AI Patient Portal"
        subtitle="Appointments, Reports & Medication Schedule"
        showBack
        rightAction={
          <TouchableOpacity
            style={styles.sosBtn}
            onPress={() =>
              Alert.alert(
                'Emergency Assistance',
                'CareSync 24/7 Rapid Emergency Response: Toll Free 108 / 1800 234 5678.\nAmbulance dispatch desk connected.'
              )
            }
          >
            <Ionicons name="call" size={14} color="#FFFFFF" />
            <Text style={styles.sosBtnText}>SOS</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Welcome Greeting Banner (Diagram 1 Patient App) */}
        <View style={styles.greetingCard}>
          <View style={styles.botIconCircle}>
            <Ionicons name="chatbubble-ellipses" size={26} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingSub}>Good morning, {currentPatient.name}</Text>
            <Text style={styles.greetingTitle}>Hi! How can I help you today?</Text>
            <Text style={styles.greetingUhid}>UHID: {currentPatient.uhid}</Text>
          </View>
        </View>

        {/* 4 Core Quick Actions (Matching Diagram 1) */}
        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push('/book-appointment')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="calendar" size={22} color="#1E6BFF" />
            </View>
            <Text style={styles.quickTitle}>Book Appointment</Text>
            <Text style={styles.quickSub}>Find Doctor & Token</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push('/reports')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: '#FDF2F8' }]}>
              <Ionicons name="document-text" size={22} color="#EC4899" />
            </View>
            <Text style={styles.quickTitle}>My Reports</Text>
            <Text style={styles.quickSub}>Lab & Imaging PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() =>
              Alert.alert(
                'Medicine Reminders',
                'Your daily dosages are scheduled below. Tap any pill once taken to update adherence.'
              )
            }
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="alarm" size={22} color="#10B981" />
            </View>
            <Text style={styles.quickTitle}>Medicine Reminder</Text>
            <Text style={styles.quickSub}>Daily Dose Tracker</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={handleHospitalNavigation}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: '#FFFBEB' }]}>
              <Ionicons name="navigate" size={22} color="#F59E0B" />
            </View>
            <Text style={styles.quickTitle}>Hospital Navigation</Text>
            <Text style={styles.quickSub}>Indoor Map & OPDs</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Medicine Reminders */}
        <Text style={styles.sectionHeader}>Today's Medicine Schedule</Text>
        <View style={styles.remindersList}>
          {patientReminders.map((rem) => (
            <TouchableOpacity
              key={rem.id}
              style={[styles.reminderCard, rem.taken && styles.reminderCardTaken]}
              onPress={() => togglePatientReminder(rem.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.remCheckbox, rem.taken && styles.remCheckboxTaken]}>
                {rem.taken && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.remTitleRow}>
                  <Text style={[styles.remMedName, rem.taken && styles.remMedNameTaken]}>
                    {rem.medicineName}
                  </Text>
                  <Badge
                    label={rem.taken ? 'Taken' : 'Scheduled'}
                    variant={rem.taken ? 'active' : 'warning'}
                  />
                </View>
                <Text style={styles.remDosage}>
                  {rem.dosage} • {rem.time}
                </Text>
                <Text style={styles.remInstructions}>{rem.instructions}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Upcoming Appointments */}
        <Text style={styles.sectionHeader}>Upcoming Clinical Visits</Text>
        <View style={styles.appointmentsList}>
          {patientAppointments.map((apt) => (
            <View key={apt.id} style={styles.aptCard}>
              <View style={styles.aptTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.aptDoctor}>{apt.doctorName}</Text>
                  <Text style={styles.aptDept}>{apt.department} • OPD</Text>
                </View>
                <Badge label={`Token #${apt.tokenNo}`} variant="active" />
              </View>
              <View style={styles.aptFooter}>
                <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.aptTime}>
                  {apt.date} at {apt.time}
                </Text>
                <TouchableOpacity
                  style={styles.viewAptBtn}
                  onPress={() => router.push('/appointments')}
                >
                  <Text style={styles.viewAptBtnText}>View In App</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Recent Invoices & Bills */}
        <Text style={styles.sectionHeader}>Recent Invoices & Payment Receipts</Text>
        <View style={styles.invoicesList}>
          {patientInvoices.map((inv) => (
            <TouchableOpacity
              key={inv.id}
              style={styles.invCard}
              onPress={() =>
                router.push({
                  pathname: '/receipt/[id]',
                  params: { id: inv.id },
                })
              }
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.invTitle}>{inv.title}</Text>
                <Text style={styles.invCode}>
                  {inv.invoiceNo} • {inv.date}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.invAmount}>₹{inv.amount.toLocaleString('en-IN')}</Text>
                <Text style={styles.invView}>View Receipt ›</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

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
  sosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
  },
  sosBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
  },
  greetingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  botIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingSub: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  greetingTitle: {
    fontSize: 16,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginVertical: 2,
  },
  greetingUhid: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: typography.fontWeights.semiBold,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  quickCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  quickIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickTitle: {
    fontSize: 13,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  quickSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  remindersList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.sm,
    ...shadows.sm,
  },
  reminderCardTaken: {
    backgroundColor: '#F8FAFC',
    opacity: 0.8,
  },
  remCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  remCheckboxTaken: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  remTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  remMedName: {
    fontSize: 13,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  remMedNameTaken: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  remDosage: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: typography.fontWeights.semiBold,
  },
  remInstructions: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  appointmentsList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  aptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  aptTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  aptDoctor: {
    fontSize: 13,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  aptDept: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  aptFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  aptTime: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
    marginLeft: 4,
  },
  viewAptBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  viewAptBtnText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  invoicesList: {
    gap: spacing.sm,
  },
  invCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  invTitle: {
    fontSize: 13,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  invCode: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  invAmount: {
    fontSize: 13,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  invView: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: typography.fontWeights.semiBold,
    marginTop: 2,
  },
});
