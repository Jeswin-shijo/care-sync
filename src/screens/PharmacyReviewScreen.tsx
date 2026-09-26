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
import { useApp } from '../context/AppContext';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { Badge } from '../components/common/Badge';

export const PharmacyReviewScreen: React.FC = () => {
  const { prescriptionReviews, resolvePrescriptionReview } = useApp();

  const handleDispense = (id: string, patientName: string) => {
    resolvePrescriptionReview(id, 'Dispensed');
    Alert.alert(
      'Prescription Cleared & Dispensed',
      `Prescription for ${patientName} has passed clinical pharmacist validation and medications have been dispensed. Receipt synced with billing.`,
      [{ text: 'OK' }]
    );
  };

  const handleContactDoctor = (doctorName: string, drugIssue: string) => {
    Alert.alert(
      'Doctor Clarification Requested',
      `Direct secure clinical alert sent to ${doctorName}:\n"${drugIssue}". Prescription held pending doctor response.`,
      [{ text: 'Done' }]
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header
        title="Pharmacy Clinical Safety"
        subtitle="Prescription Review & Drug Interaction Alerts"
        showBack
        rightAction={
          <View style={styles.safetyHeaderBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
            <Text style={styles.safetyHeaderBadgeText}>Safety Engine</Text>
          </View>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Safety Engine Status Overview (Diagram 1) */}
        <View style={styles.safetyStatusCard}>
          <View style={styles.safetyStatusTop}>
            <Ionicons name="medical" size={24} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.safetyTitle}>MediOS AI Pharmacological Guardrails</Text>
              <Text style={styles.safetySub}>
                Real-time drug-drug interaction matrix, allergy screening & dosage checks active.
              </Text>
            </View>
          </View>

          <View style={styles.safetyPillGrid}>
            <View style={styles.safetyPillItem}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={styles.safetyPillText}>Drug Interaction Check</Text>
            </View>
            <View style={styles.safetyPillItem}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={styles.safetyPillText}>Allergy Matrix Check</Text>
            </View>
            <View style={styles.safetyPillItem}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={styles.safetyPillText}>Dose Range Validation</Text>
            </View>
            <View style={styles.safetyPillItem}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={styles.safetyPillText}>Alternative Suggestions</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionHeader}>Prescriptions Awaiting Pharmacist Review</Text>

        <View style={styles.reviewsList}>
          {prescriptionReviews.map((item) => {
            const hasWarning =
              item.safetyStatus === 'Interaction Warning' ||
              item.safetyStatus === 'Allergy Warning';
            const isDispensed = item.status === 'Dispensed';

            return (
              <View key={item.id} style={styles.reviewCard}>
                <View style={styles.reviewCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rxCode}>{item.prescriptionCode}</Text>
                    <Text style={styles.rxPatient}>
                      {item.patientName} ({item.age}y • {item.gender})
                    </Text>
                    <Text style={styles.rxDoctor}>Prescribed by: {item.doctorName}</Text>
                  </View>
                  <Badge
                    label={item.safetyStatus}
                    variant={
                      item.safetyStatus === 'Safe'
                        ? 'active'
                        : item.safetyStatus === 'Allergy Warning'
                        ? 'danger'
                        : 'warning'
                    }
                  />
                </View>

                {/* Drugs List */}
                <View style={styles.drugsContainer}>
                  <Text style={styles.drugsLabel}>Prescribed Medication Regimen:</Text>
                  {item.drugs.map((drug, idx) => (
                    <View key={idx} style={styles.drugItemRow}>
                      <Ionicons name="ellipse" size={6} color={colors.primary} />
                      <Text style={styles.drugName}>{drug}</Text>
                    </View>
                  ))}
                </View>

                {/* Interaction Alert Banner if flagged */}
                {item.interactionAlert && (
                  <View style={styles.interactionBanner}>
                    <Ionicons name="warning" size={18} color="#D97706" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.interactionTitle}>Drug-Drug Interaction Alert</Text>
                      <Text style={styles.interactionText}>{item.interactionAlert}</Text>
                    </View>
                  </View>
                )}

                {/* Allergy Alert Banner if flagged */}
                {item.allergyAlert && (
                  <View style={styles.allergyBanner}>
                    <Ionicons name="alert-circle" size={18} color="#DC2626" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.allergyTitle}>Critical Allergy Flag</Text>
                      <Text style={styles.allergyText}>{item.allergyAlert}</Text>
                    </View>
                  </View>
                )}

                {/* Dosage validation note */}
                <View style={styles.validationRow}>
                  <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.validationText}>Dose Validation: {item.dosageValidation}</Text>
                </View>

                {/* Alternative suggestion if available */}
                {item.alternativeSuggestion && (
                  <View style={styles.alternativeBox}>
                    <Text style={styles.alternativeLabel}>MediOS AI Alternative Suggestion:</Text>
                    <Text style={styles.alternativeText}>{item.alternativeSuggestion}</Text>
                  </View>
                )}

                {/* Actions */}
                <View style={styles.actionsRow}>
                  {hasWarning && !isDispensed && (
                    <TouchableOpacity
                      style={styles.clarifyBtn}
                      onPress={() =>
                        handleContactDoctor(
                          item.doctorName,
                          item.interactionAlert || item.allergyAlert || 'Dosage query'
                        )
                      }
                      activeOpacity={0.8}
                    >
                      <Ionicons name="chatbubbles" size={14} color="#B45309" />
                      <Text style={styles.clarifyBtnText}>Request Doctor Clarification</Text>
                    </TouchableOpacity>
                  )}

                  {!isDispensed ? (
                    <TouchableOpacity
                      style={[styles.dispenseBtn, hasWarning && { backgroundColor: '#059669' }]}
                      onPress={() => handleDispense(item.id, item.patientName)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
                      <Text style={styles.dispenseBtnText}>
                        {hasWarning ? 'Override & Dispense' : 'Approve & Dispense'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.dispensedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                      <Text style={styles.dispensedBadgeText}>Dispensed to Patient</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
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
  safetyHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D9488',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
  },
  safetyHeaderBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  safetyStatusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  safetyStatusTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  safetyTitle: {
    fontSize: 13,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  safetySub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  safetyPillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  safetyPillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  safetyPillText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.medium,
    color: colors.text,
  },
  reviewsList: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  rxCode: {
    fontSize: 13,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.primary,
  },
  rxPatient: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: 2,
  },
  rxDoctor: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  drugsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  drugsLabel: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  drugItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 2,
  },
  drugName: {
    fontSize: 12,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  interactionBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 8,
    marginVertical: 4,
  },
  interactionTitle: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: '#92400E',
  },
  interactionText: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 16,
  },
  allergyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 8,
    marginVertical: 4,
  },
  allergyTitle: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: '#DC2626',
  },
  allergyText: {
    fontSize: 11,
    color: '#991B1B',
    marginTop: 2,
    lineHeight: 16,
  },
  validationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  validationText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  alternativeBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: 6,
  },
  alternativeLabel: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: '#1E40AF',
  },
  alternativeText: {
    fontSize: 11,
    color: '#1D4ED8',
    marginTop: 2,
    lineHeight: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  clarifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.md,
    gap: 4,
  },
  clarifyBtnText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: '#92400E',
  },
  dispenseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    gap: 6,
  },
  dispenseBtnText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: '#FFFFFF',
  },
  dispensedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    gap: 4,
  },
  dispensedBadgeText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.success,
  },
});
