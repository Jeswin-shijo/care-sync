import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '../context/AppContext';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { Avatar } from '../components/common/Avatar';
import { Badge } from '../components/common/Badge';

export const DoctorCopilotScreen: React.FC = () => {
  const { patients, selectedPatient, setSelectedPatient, hospitalProtocols } = useApp();

  const activePatient = selectedPatient || patients[0];
  const [activeCopilotTab, setActiveCopilotTab] = useState<
    'Summarize' | 'Reports' | 'Draft Notes' | 'Med Review' | 'Insights' | 'Protocols'
  >('Summarize');

  const [clinicalNotesDraft, setClinicalNotesDraft] = useState(
    `S: 32y female presenting with acute high-grade fever x 3 days, mild chills, and fatigue. No cough or shortness of breath.\nO: BP 118/76 mmHg, Pulse 92 bpm, Temp 101.4°F, SpO2 98% on room air. Chest clear.\nA: Acute Viral Pyrexia with mild dehydration.\nP: Hydration, Oral Paracetamol 500mg TDS, LFT/CBC labs pending.`
  );

  const [protocolQuery, setProtocolQuery] = useState('');

  const handleApproveNotes = () => {
    Alert.alert(
      'Clinical Notes Approved',
      `SOAP progress note for ${activePatient.name} has been verified and permanently committed to the EMR database under Doctor ID: DOC-PRIYA.`,
      [{ text: 'OK' }]
    );
  };

  const handleActionPill = (tab: typeof activeCopilotTab) => {
    setActiveCopilotTab(tab);
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header
        title="MediOS AI Doctor Copilot"
        subtitle="One Screen. Complete Patient Intelligence."
        showBack
        rightAction={
          <View style={styles.copilotBadge}>
            <Ionicons name="sparkles" size={14} color="#FFFFFF" />
            <Text style={styles.copilotBadgeText}>GPT-6 Active</Text>
          </View>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Quick Stats Bar */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>24</Text>
            <Text style={styles.statLabel}>Today's Patients</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: colors.warning }]}>8</Text>
            <Text style={styles.statLabel}>Pending Labs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: colors.danger }]}>5</Text>
            <Text style={styles.statLabel}>AI Alerts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>7</Text>
            <Text style={styles.statLabel}>Notes Pending</Text>
          </View>
        </View>

        {/* Patient Switcher Horizontal Scroll */}
        <Text style={styles.sectionHeader}>Select Patient for Clinical Intelligence</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.patientPillScroll}
        >
          {patients.map((p) => {
            const isSelected = p.id === activePatient.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.patientPill, isSelected && styles.patientPillActive]}
                onPress={() => setSelectedPatient(p)}
                activeOpacity={0.75}
              >
                <Avatar name={p.name} size={30} />
                <View>
                  <Text style={[styles.patientPillName, isSelected && styles.patientPillNameActive]}>
                    {p.name}
                  </Text>
                  <Text style={styles.patientPillSub}>
                    {p.age}y • {p.gender}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Patient Summary Card (One Screen Intelligence) */}
        <View style={styles.patientSummaryCard}>
          <View style={styles.summaryTop}>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.summaryPatientName}>{activePatient.name}</Text>
                <Badge
                  label={activePatient.status}
                  variant={activePatient.status === 'Active' ? 'active' : 'admitted'}
                />
              </View>
              <Text style={styles.summaryUhid}>
                UHID: {activePatient.uhid} • Blood: {activePatient.bloodGroup}
              </Text>
              <Text style={styles.summaryAddress}>{activePatient.address}</Text>
            </View>
          </View>

          {/* Clinical Vital Signs Bar */}
          <View style={styles.vitalsGrid}>
            <View style={styles.vitalCol}>
              <Text style={styles.vitalKey}>Blood Pressure</Text>
              <Text style={styles.vitalVal}>118/76 mmHg</Text>
            </View>
            <View style={styles.vitalCol}>
              <Text style={styles.vitalKey}>Pulse Rate</Text>
              <Text style={styles.vitalVal}>92 bpm</Text>
            </View>
            <View style={styles.vitalCol}>
              <Text style={styles.vitalKey}>SpO2</Text>
              <Text style={styles.vitalVal}>98% Air</Text>
            </View>
            <View style={styles.vitalCol}>
              <Text style={styles.vitalKey}>Temp</Text>
              <Text style={[styles.vitalVal, { color: colors.danger }]}>101.4°F</Text>
            </View>
          </View>
        </View>

        {/* Top Copilot Action Tabs */}
        <Text style={styles.sectionHeader}>AI Copilot Actions</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.actionPillsScroll}
        >
          {(
            [
              'Summarize',
              'Reports',
              'Draft Notes',
              'Med Review',
              'Insights',
              'Protocols',
            ] as const
          ).map((tab) => {
            const isActive = activeCopilotTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.actionPill, isActive && styles.actionPillActive]}
                onPress={() => handleActionPill(tab)}
              >
                <Ionicons
                  name={
                    tab === 'Summarize'
                      ? 'document-text-outline'
                      : tab === 'Reports'
                      ? 'analytics-outline'
                      : tab === 'Draft Notes'
                      ? 'create-outline'
                      : tab === 'Med Review'
                      ? 'medical-outline'
                      : tab === 'Insights'
                      ? 'bulb-outline'
                      : 'shield-checkmark-outline'
                  }
                  size={15}
                  color={isActive ? '#FFFFFF' : colors.primary}
                />
                <Text style={[styles.actionPillText, isActive && styles.actionPillTextActive]}>
                  {tab === 'Summarize'
                    ? 'Summarize History'
                    : tab === 'Reports'
                    ? 'Analyze Reports'
                    : tab === 'Draft Notes'
                    ? 'Draft Notes (SOAP)'
                    : tab === 'Med Review'
                    ? 'Medication Review'
                    : tab === 'Insights'
                    ? 'Clinical Insights'
                    : 'Hospital Protocols'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Copilot Active Panel Content */}
        <View style={styles.copilotOutputCard}>
          {activeCopilotTab === 'Summarize' && (
            <View>
              <View style={styles.outputHeader}>
                <Ionicons name="sparkles" size={18} color={colors.primary} />
                <Text style={styles.outputTitle}>Patient Longitudinal Medical Summary</Text>
              </View>
              <Text style={styles.summaryBodyText}>
                • <Text style={styles.boldText}>Chief Complaint:</Text> 3-day history of sudden onset fever with body ache and generalized fatigue.
              </Text>
              <Text style={styles.summaryBodyText}>
                • <Text style={styles.boldText}>Past History:</Text> Known patient since Jan 2025. No history of DM, HTN, or bronchial asthma. Immunizations up to date.
              </Text>
              <Text style={styles.summaryBodyText}>
                • <Text style={styles.boldText}>Previous Admissions:</Text> Admitted 5 days in Sep 2025 for acute viral syndrome with complete resolution upon discharge.
              </Text>
              <Text style={styles.summaryBodyText}>
                • <Text style={styles.boldText}>Drug Allergies:</Text> No known drug allergies (NKDA).
              </Text>
              <View style={styles.aiBadgeInline}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={styles.aiBadgeInlineText}>Synthesized across 4 EMR visit encounters</Text>
              </View>
            </View>
          )}

          {activeCopilotTab === 'Reports' && (
            <View>
              <View style={styles.outputHeader}>
                <Ionicons name="analytics" size={18} color="#0D9488" />
                <Text style={styles.outputTitle}>Diagnostic Lab & Radiology Analysis</Text>
              </View>
              <View style={styles.reportRow}>
                <Text style={styles.reportTestName}>Complete Blood Count (CBC)</Text>
                <Badge label="Normal" variant="active" />
              </View>
              <Text style={styles.reportDetail}>
                Hb: 12.8 g/dL • WBC: 7,400/mcL • Platelets: 2.4 Lakhs • No toxic granulation or atypical cells.
              </Text>

              <View style={[styles.reportRow, { marginTop: 12 }]}>
                <Text style={styles.reportTestName}>Liver Function Test (LFT)</Text>
                <Badge label="Mild Elevation" variant="warning" />
              </View>
              <Text style={styles.reportDetail}>
                SGPT (ALT): 48 U/L (mild elevation) • Serum Bilirubin: 0.9 mg/dL (Normal). Suggestive of reactive viral hepatic stress.
              </Text>

              <View style={[styles.reportRow, { marginTop: 12 }]}>
                <Text style={styles.reportTestName}>Chest X-Ray (PA View)</Text>
                <Badge label="Clear" variant="active" />
              </View>
              <Text style={styles.reportDetail}>
                Bilateral lung fields clear. Costophrenic angles normal. Normal cardiothoracic ratio.
              </Text>
            </View>
          )}

          {activeCopilotTab === 'Draft Notes' && (
            <View>
              <View style={styles.outputHeader}>
                <Ionicons name="create" size={18} color={colors.primary} />
                <Text style={styles.outputTitle}>AI Draft Clinical Notes (SOAP)</Text>
              </View>
              <TextInput
                style={styles.notesInput}
                multiline
                numberOfLines={6}
                value={clinicalNotesDraft}
                onChangeText={setClinicalNotesDraft}
              />
              <TouchableOpacity
                style={styles.approveBtn}
                onPress={handleApproveNotes}
                activeOpacity={0.8}
              >
                <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
                <Text style={styles.approveBtnText}>Doctor Approve & Save to EMR</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeCopilotTab === 'Med Review' && (
            <View>
              <View style={styles.outputHeader}>
                <Ionicons name="shield" size={18} color="#F59E0B" />
                <Text style={styles.outputTitle}>Clinical Rules & Drug Safety Matrix</Text>
              </View>
              <View style={styles.alertBoxGreen}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertGreenTitle}>No High-Risk Drug Interactions Detected</Text>
                  <Text style={styles.alertGreenSub}>
                    Current regimen: Paracetamol 500mg + Pantoprazole 40mg + Vitamin D3.
                  </Text>
                </View>
              </View>

              <View style={[styles.alertBoxOrange, { marginTop: 10 }]}>
                <Ionicons name="alert-circle" size={18} color="#D97706" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertOrangeTitle}>Rule Check: Fever Over 48 Hours</Text>
                  <Text style={styles.alertOrangeSub}>
                    CDSS recommends Dengue NS1 antigen and Peripheral Smear for Malarial Parasite if fever persists past Day 4.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {activeCopilotTab === 'Insights' && (
            <View>
              <View style={styles.outputHeader}>
                <Ionicons name="bulb" size={18} color="#8B5CF6" />
                <Text style={styles.outputTitle}>Clinical Decision Support (CDSS)</Text>
              </View>
              <Text style={styles.summaryBodyText}>
                • <Text style={styles.boldText}>Differential Diagnosis:</Text> Acute Viral Upper Respiratory Tract Infection (85% probability), Early Dengue Fever (10%), Urinary Tract Infection (5%).
              </Text>
              <Text style={styles.summaryBodyText}>
                • <Text style={styles.boldText}>Next Best Action:</Text> Hydration therapy (oral fluids 2.5L/day), Paracetamol for pyrexia. Re-evaluate if temperature spikes above 102.5°F or warning signs develop (abdominal pain, bleeding).
              </Text>
              <Text style={styles.summaryBodyText}>
                • <Text style={styles.boldText}>Evidence Citation:</Text> WHO Clinical Management Guidelines for Acute Febrile Illness (AFI 2024.4).
              </Text>
            </View>
          )}

          {activeCopilotTab === 'Protocols' && (
            <View>
              <View style={styles.outputHeader}>
                <Ionicons name="book" size={18} color="#1E6BFF" />
                <Text style={styles.outputTitle}>Hospital Knowledge Base (RAG)</Text>
              </View>
              <TextInput
                style={styles.protocolSearchInput}
                placeholder="Search hospital protocols & SOPs..."
                value={protocolQuery}
                onChangeText={setProtocolQuery}
              />
              {hospitalProtocols.map((proto) => (
                <View key={proto.id} style={styles.protocolItem}>
                  <Text style={styles.protoTitle}>{proto.title}</Text>
                  <Text style={styles.protoDesc}>{proto.description}</Text>
                  {proto.keySteps.map((step, idx) => (
                    <Text key={idx} style={styles.protoStep}>
                      {step}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Medical Safety Guardrail Banner */}
        <View style={styles.guardrailBanner}>
          <Ionicons name="medical" size={16} color={colors.textSecondary} />
          <Text style={styles.guardrailText}>
            MediOS AI Clinical Guardrails Active • All recommendations require independent licensed doctor confirmation prior to execution.
          </Text>
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
  copilotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
  },
  copilotBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.borderLight,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.text,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: typography.fontWeights.medium,
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
  patientPillScroll: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  patientPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    gap: spacing.xs,
  },
  patientPillActive: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  patientPillName: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  patientPillNameActive: {
    color: colors.primary,
  },
  patientPillSub: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  patientSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryPatientName: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  summaryUhid: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  summaryAddress: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  vitalsGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  vitalCol: {
    flex: 1,
    alignItems: 'center',
  },
  vitalKey: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 2,
  },
  vitalVal: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  actionPillsScroll: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  actionPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.primary,
  },
  actionPillTextActive: {
    color: '#FFFFFF',
  },
  copilotOutputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  outputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  outputTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  summaryBodyText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  boldText: {
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  aiBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
    backgroundColor: '#F0FDF4',
    padding: 6,
    borderRadius: radius.sm,
  },
  aiBadgeInlineText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: typography.fontWeights.medium,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  reportTestName: {
    fontSize: 13,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  reportDetail: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  notesInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    fontSize: 12,
    color: colors.text,
    lineHeight: 18,
    marginBottom: spacing.md,
    textAlignVertical: 'top',
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.md,
    gap: 8,
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: typography.fontWeights.bold,
  },
  alertBoxGreen: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 8,
  },
  alertGreenTitle: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: '#166534',
  },
  alertGreenSub: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 2,
  },
  alertBoxOrange: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 8,
  },
  alertOrangeTitle: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: '#92400E',
  },
  alertOrangeSub: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
  },
  protocolSearchInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  protocolItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  protoTitle: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
    marginBottom: 2,
  },
  protoDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  protoStep: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
  guardrailBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.sm,
    backgroundColor: '#F1F5F9',
    borderRadius: radius.md,
  },
  guardrailText: {
    flex: 1,
    fontSize: 10,
    color: colors.textSecondary,
    lineHeight: 14,
  },
});
