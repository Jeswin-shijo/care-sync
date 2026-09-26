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

export const LabPortalScreen: React.FC = () => {
  const { labSamples, updateLabSampleStatus } = useApp();

  const [activeTab, setActiveTab] = useState<'All' | 'New' | 'Processing' | 'Completed' | 'Abnormal'>('All');

  const newCount = labSamples.filter((s) => s.status === 'New').length + 11;
  const processingCount = labSamples.filter((s) => s.status === 'Processing').length + 27;
  const completedCount = labSamples.filter((s) => s.status === 'Completed').length + 55;
  const abnormalCount = labSamples.filter((s) => s.status === 'Abnormal').length + 6;

  const filteredSamples = labSamples.filter((s) => {
    if (activeTab === 'All') return true;
    return s.status === activeTab;
  });

  const handleGenerateAiSummary = () => {
    Alert.alert(
      'MediOS AI Lab Summary',
      `Analysis of 8 Abnormal Diagnostic Findings:\n\n1. Vikram K (LFT): Serum ALT/AST elevated 2x above reference range. Differential: Drug-induced hepatotoxicity or acute viral hepatitis.\n2. Meera Krishnan (HbA1c): Critical Glycemia (10.2%). High risk of microvascular diabetic complications. Urgent endocrinology review required.\n\nAll critical alerts broadcasted to attending physicians via Secure Messaging.`,
      [{ text: 'Acknowledge', style: 'default' }]
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header
        title="MediOS AI Lab Portal"
        subtitle="Sample Tracking & AI Report Summary"
        showBack
        rightAction={
          <TouchableOpacity
            style={styles.aiSummaryHeaderBtn}
            onPress={handleGenerateAiSummary}
            activeOpacity={0.8}
          >
            <Ionicons name="sparkles" size={15} color="#FFFFFF" />
            <Text style={styles.aiSummaryHeaderBtnText}>AI Summary</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Lab Dashboard KPIs (Diagram 1) */}
        <Text style={styles.sectionHeader}>Diagnostic Lab Pipeline</Text>
        <View style={styles.kpiGrid}>
          <TouchableOpacity
            style={[styles.kpiCard, activeTab === 'New' && styles.kpiCardActive]}
            onPress={() => setActiveTab('New')}
            activeOpacity={0.8}
          >
            <Text style={styles.kpiLabel}>New Samples</Text>
            <Text style={[styles.kpiNumber, { color: colors.primary }]}>{newCount}</Text>
            <Text style={styles.kpiSub}>Awaiting Processing</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.kpiCard, activeTab === 'Processing' && styles.kpiCardActive]}
            onPress={() => setActiveTab('Processing')}
            activeOpacity={0.8}
          >
            <Text style={styles.kpiLabel}>Processing</Text>
            <Text style={[styles.kpiNumber, { color: colors.warning }]}>{processingCount}</Text>
            <Text style={styles.kpiSub}>In Analyzers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.kpiCard, activeTab === 'Completed' && styles.kpiCardActive]}
            onPress={() => setActiveTab('Completed')}
            activeOpacity={0.8}
          >
            <Text style={styles.kpiLabel}>Completed</Text>
            <Text style={[styles.kpiNumber, { color: colors.success }]}>{completedCount}</Text>
            <Text style={styles.kpiSub}>Verified & Signed</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.kpiCard, activeTab === 'Abnormal' && styles.kpiCardActive]}
            onPress={() => setActiveTab('Abnormal')}
            activeOpacity={0.8}
          >
            <Text style={styles.kpiLabel}>Abnormal</Text>
            <Text style={[styles.kpiNumber, { color: colors.danger }]}>{abnormalCount}</Text>
            <Text style={styles.kpiSub}>Doctor Flagged</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {(['All', 'New', 'Processing', 'Completed', 'Abnormal'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.filterPill, activeTab === tab && styles.filterPillActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.filterPillText, activeTab === tab && styles.filterPillTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sample Tracking Cards */}
        <Text style={styles.sectionHeader}>Specimen & Lab Orders Queue</Text>
        <View style={styles.samplesList}>
          {filteredSamples.map((sample) => (
            <View key={sample.id} style={styles.sampleCard}>
              <View style={styles.sampleTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sampleCode}>{sample.sampleCode}</Text>
                  <Text style={styles.samplePatient}>
                    {sample.patientName} (UHID: {sample.uhid})
                  </Text>
                </View>
                <Badge
                  label={sample.status}
                  variant={
                    sample.status === 'Completed'
                      ? 'active'
                      : sample.status === 'Abnormal'
                      ? 'danger'
                      : sample.status === 'Processing'
                      ? 'warning'
                      : 'discharged'
                  }
                />
              </View>

              <View style={styles.testDetailsRow}>
                <Ionicons name="flask" size={16} color={colors.primary} />
                <Text style={styles.testNameText}>{sample.testName}</Text>
                <Text style={styles.categoryBadge}>{sample.category}</Text>
              </View>

              {sample.resultValue && (
                <View style={styles.resultsBox}>
                  <Text style={styles.resultLabel}>Reported Biomarkers:</Text>
                  <Text style={styles.resultText}>{sample.resultValue}</Text>
                  {sample.normalRange && (
                    <Text style={styles.rangeText}>Ref: {sample.normalRange}</Text>
                  )}
                </View>
              )}

              {sample.flag && (
                <View style={styles.flagAlertBanner}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.flagAlertText}>{sample.flag}</Text>
                </View>
              )}

              <View style={styles.sampleFooter}>
                <Text style={styles.sampleTime}>
                  Collected: {sample.collectedAt} • ETA: {sample.turnaroundTime}
                </Text>
                {sample.status === 'Processing' && (
                  <TouchableOpacity
                    style={styles.markDoneBtn}
                    onPress={() => updateLabSampleStatus(sample.id, 'Completed')}
                  >
                    <Text style={styles.markDoneBtnText}>Sign & Complete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
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
  aiSummaryHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  aiSummaryHeaderBtnText: {
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
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  kpiCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  kpiNumber: {
    fontSize: 22,
    fontWeight: typography.fontWeights.extraBold,
    marginVertical: 2,
  },
  kpiSub: {
    fontSize: 10,
    color: colors.textMuted,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.md,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  samplesList: {
    gap: spacing.sm,
  },
  sampleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  sampleTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  sampleCode: {
    fontSize: 13,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.primary,
  },
  samplePatient: {
    fontSize: 12,
    color: colors.text,
    fontWeight: typography.fontWeights.medium,
    marginTop: 2,
  },
  testDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 6,
  },
  testNameText: {
    fontSize: 13,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  categoryBadge: {
    fontSize: 10,
    color: '#0284C7',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: typography.fontWeights.medium,
  },
  resultsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  resultLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 2,
  },
  resultText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  rangeText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  flagAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: radius.md,
    padding: 8,
    gap: 6,
    marginVertical: 4,
  },
  flagAlertText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: '#DC2626',
    flex: 1,
  },
  sampleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  sampleTime: {
    fontSize: 10,
    color: colors.textMuted,
  },
  markDoneBtn: {
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  markDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
  },
});
