import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useApp } from '../context/AppContext';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { HOSPITAL_CONFIG } from '../constants/config';
import { DISCHARGE_SUMMARY_SAMPLE } from '../data/mockData';
import { Header } from '../components/common/Header';
import { Avatar } from '../components/common/Avatar';
import { Button } from '../components/common/Button';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'DischargeSummary'>;

export const DischargeSummaryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const { patients } = useApp();

  const patientId = route.params?.patientId;
  const activePatient = patients.find((p) => p.id === patientId) || patients[0];

  const [activeTab, setActiveTab] = useState<'Summary' | 'Treatment' | 'Prescription'>('Summary');

  const summary = DISCHARGE_SUMMARY_SAMPLE;

  const handleDownloadPdf = async () => {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0F172A; }
            .header { text-align: center; border-bottom: 2px solid #1E6BFF; padding-bottom: 12px; margin-bottom: 16px; }
            .title { font-size: 20px; font-weight: bold; color: #1E6BFF; margin: 8px 0; }
            .meta-grid { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 13px; line-height: 1.6; }
            .section-title { font-size: 14px; font-weight: bold; color: #1E293B; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; margin-top: 16px; margin-bottom: 8px; }
            .content-p { font-size: 13px; color: #334155; margin: 4px 0 8px 0; }
            .rx-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            .rx-table th, .rx-table td { border: 1px solid #E2E8F0; padding: 8px; font-size: 12px; text-align: left; }
            .rx-table th { background-color: #F8FAFC; }
            .footer { margin-top: 36px; display: flex; justify-content: space-between; align-items: flex-end; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin:0; color:#1E6BFF;">${HOSPITAL_CONFIG.name}</h2>
            <div style="font-size:11px; color:#64748B;">${HOSPITAL_CONFIG.address} | Phone: ${HOSPITAL_CONFIG.phone}</div>
            <div class="title">PATIENT DISCHARGE SUMMARY</div>
          </div>
          <div class="meta-grid">
            <div>
              <strong>Patient Name:</strong> ${activePatient.name}<br/>
              <strong>UHID:</strong> ${activePatient.uhid}<br/>
              <strong>Room / Ward:</strong> ${summary.room}
            </div>
            <div style="text-align:right;">
              <strong>Admission Date:</strong> ${summary.admissionDate}<br/>
              <strong>Discharge Date:</strong> ${summary.dischargeDate}<br/>
              <strong>Consultant:</strong> ${summary.doctorName}
            </div>
          </div>
          <div class="section-title">FINAL DIAGNOSIS</div>
          <p class="content-p">${summary.diagnosis}</p>
          <div class="section-title">COURSE IN HOSPITAL & TREATMENT GIVEN</div>
          <p class="content-p">${summary.treatmentGiven}</p>
          <div class="section-title">DISCHARGE ADVICE & PRECAUTIONS</div>
          <ul>
            ${summary.advice.map((adv) => `<li style="font-size:12px; color:#334155; margin-bottom:4px;">${adv}</li>`).join('')}
          </ul>
          <div class="section-title">DISCHARGE PRESCRIPTION</div>
          <table class="rx-table">
            <thead><tr><th>Medicine Name</th><th>Dosage & Frequency</th><th>Duration</th></tr></thead>
            <tbody>
              ${summary.prescriptions.map((rx) => `<tr><td><strong>${rx.name}</strong></td><td>${rx.dosage}</td><td>${rx.duration}</td></tr>`).join('')}
            </tbody>
          </table>
          <div class="footer">
            <div style="font-size:11px; color:#94A3B8;">CareSync Hospital EHR System</div>
            <div style="text-align:center;">
              <div style="font-style:italic; font-size:14px;">Dr. Priya Menon</div>
              <div style="border-top:1px solid #94A3B8; width:140px; margin-top:20px; font-size:11px; color:#64748B;">Attending Physician</div>
            </div>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `${activePatient.name}_Discharge_Summary.pdf`,
        });
      } else {
        Alert.alert('PDF Exported', `Saved to ${uri}`);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to download PDF');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Discharge Summary" showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Patient Header Card */}
        <View style={styles.patientHeaderCard}>
          <Avatar name={activePatient.name} size={48} />
          <View style={{ flex: 1 }}>
            <Text style={styles.patientName}>{activePatient.name}</Text>
            <Text style={styles.patientUhid}>UHID: {activePatient.uhid}</Text>
            <Text style={styles.stayText}>
              IPD • {summary.room} • {summary.stayDuration}
            </Text>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          {(['Summary', 'Treatment', 'Prescription'] as const).map((tab) => {
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

        {/* Content based on Tab */}
        {activeTab === 'Summary' && (
          <View style={styles.sectionCard}>
            <View style={styles.detailBlock}>
              <Text style={styles.label}>Diagnosis</Text>
              <Text style={styles.valueStrong}>{summary.diagnosis}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailBlock}>
              <Text style={styles.label}>Treatment Given</Text>
              <Text style={styles.valueRegular}>{summary.treatmentGiven}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailBlock}>
              <Text style={styles.label}>Advice</Text>
              {summary.advice.map((item, index) => (
                <View key={index} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'Treatment' && (
          <View style={styles.sectionCard}>
            <Text style={styles.cardTitle}>In-Patient Course & Vitals</Text>
            <View style={styles.vitalsBox}>
              <Text style={styles.vitalItem}>Admission BP: 124/82 mmHg</Text>
              <Text style={styles.vitalItem}>Discharge Temp: 98.4°F (Afebrile)</Text>
              <Text style={styles.vitalItem}>SpO2 on Room Air: 99%</Text>
            </View>
            <Text style={styles.cardTitle}>Clinical Notes</Text>
            <Text style={styles.valueRegular}>
              Patient was admitted with acute high grade fever and fatigue. Routine blood investigations showed mild leukopenia consistent with viral infection. Patient responded very well to IV fluids and antipyretics. Discharge cleared in stable condition.
            </Text>
          </View>
        )}

        {activeTab === 'Prescription' && (
          <View style={styles.sectionCard}>
            <Text style={styles.cardTitle}>Discharge Medications</Text>
            {summary.prescriptions.map((rx, idx) => (
              <View key={idx} style={styles.medCard}>
                <Ionicons name="medical" size={18} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.medName}>{rx.name}</Text>
                  <Text style={styles.medDosage}>{rx.dosage}</Text>
                  <Text style={styles.medDuration}>Duration: {rx.duration}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Action Button */}
        <View style={styles.actionContainer}>
          <Button
            title="Download PDF"
            onPress={handleDownloadPdf}
            icon={<Ionicons name="download-outline" size={20} color="#FFFFFF" />}
            fullWidth
            size="lg"
          />
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
    padding: spacing.base,
    paddingBottom: spacing.xxl,
  },
  patientHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.md,
    marginBottom: spacing.base,
    ...shadows.sm,
  },
  patientName: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  patientUhid: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: typography.fontWeights.semiBold,
    marginTop: 2,
  },
  stayText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
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
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: 8,
  },
  detailBlock: {
    marginVertical: 4,
  },
  label: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
    marginBottom: 4,
  },
  valueStrong: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  valueRegular: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.md,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  bulletDot: {
    color: colors.primary,
    fontSize: 16,
    lineHeight: 18,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  vitalsBox: {
    backgroundColor: colors.cardMuted,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    gap: 4,
  },
  vitalItem: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  medCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardMuted,
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.md,
    marginBottom: 8,
  },
  medName: {
    fontSize: 13,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  medDosage: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  medDuration: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: typography.fontWeights.medium,
    marginTop: 2,
  },
  actionContainer: {
    marginTop: spacing.lg,
  },
});
