import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useApp } from '../context/AppContext';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { HOSPITAL_CONFIG } from '../constants/config';
import { Header } from '../components/common/Header';
import { Avatar } from '../components/common/Avatar';
import { Button } from '../components/common/Button';

interface PrescriptionItem {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  days: string;
}

export default function OpdConsultationRoute() {
  const { patientId } = useLocalSearchParams<{ patientId?: string }>();
  const { patients, createInvoice } = useApp();

  const [selectedPatientId, setSelectedPatientId] = useState(patientId || patients[0]?.id || '');
  const activePatient = patients.find((p) => p.id === selectedPatientId) || patients[0];

  const [symptoms, setSymptoms] = useState(
    'Patient presents with moderate fever (101°F) for 3 days, accompanied by generalized body ache, fatigue, and mild dry cough.'
  );
  const [diagnosis, setDiagnosis] = useState('Acute Viral Upper Respiratory Infection');
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([
    {
      id: '1',
      name: 'Paracetamol 500mg',
      dosage: '1 Tab',
      frequency: 'TDS (3 times/day)',
      days: '5 days',
    },
    {
      id: '2',
      name: 'Pantoprazole 40mg',
      dosage: '1 Tab',
      frequency: 'OD (Before food)',
      days: '5 days',
    },
    {
      id: '3',
      name: 'Cetirizine 10mg',
      dosage: '1 Tab',
      frequency: 'HS (Night only)',
      days: '3 days',
    },
  ]);

  const handleAddMedicine = () => {
    const newItem: PrescriptionItem = {
      id: String(Date.now()),
      name: 'Vitamin C 500mg',
      dosage: '1 Tab',
      frequency: 'OD (After lunch)',
      days: '7 days',
    };
    setPrescriptions((prev) => [...prev, newItem]);
  };

  const handleRemovePrescription = (id: string) => {
    setPrescriptions((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSaveConsultation = () => {
    createInvoice({
      type: 'OPD',
      patientId: activePatient.id,
      amount: 1200,
      paymentMode: 'UPI',
      title: 'OPD Consultation Fee',
      doctorName: `${HOSPITAL_CONFIG.doctorName} (${HOSPITAL_CONFIG.doctorSpecialty})`,
      items: [
        { description: 'Specialist OPD Consultation', qty: 1, rate: 800, amount: 800 },
        { description: 'Diagnostic Assessment & Rx Stamping', qty: 1, rate: 400, amount: 400 },
      ],
    });

    Alert.alert(
      'Consultation Saved',
      `Clinical consultation recorded for ${activePatient.name}. Diagnostic Rx generated and billed.`,
      [
        {
          text: 'View Billing',
          onPress: () => router.push('/(tabs)/billing'),
        },
        { text: 'Done', onPress: () => router.back() },
      ]
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header title="OPD Consultation" showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Doctor Header Banner */}
        <View style={styles.doctorHeaderCard}>
          <Avatar name={HOSPITAL_CONFIG.doctorName} size={48} />
          <View style={{ flex: 1 }}>
            <Text style={styles.doctorName}>{HOSPITAL_CONFIG.doctorName}</Text>
            <Text style={styles.doctorSpecialty}>{HOSPITAL_CONFIG.doctorSpecialty}</Text>
            <Text style={styles.doctorRoom}>{HOSPITAL_CONFIG.doctorRoom}</Text>
          </View>
        </View>

        {/* Patient Selection Dropdown */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Patient</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {patients.map((p) => {
              const isSelected = selectedPatientId === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setSelectedPatientId(p.id)}
                  style={[styles.patientPill, isSelected && styles.patientPillActive]}
                >
                  <Text style={[styles.patientPillName, isSelected && styles.patientPillNameActive]}>
                    {p.name}
                  </Text>
                  <Text style={[styles.patientPillUhid, isSelected && styles.patientPillUhidActive]}>
                    ({p.uhid})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Symptoms / Notes */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Symptoms / Notes</Text>
          <TextInput
            value={symptoms}
            onChangeText={setSymptoms}
            placeholder="Enter consultation notes..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            style={styles.textArea}
          />
        </View>

        {/* Diagnosis */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Diagnosis</Text>
          <TextInput
            value={diagnosis}
            onChangeText={setDiagnosis}
            placeholder="Enter diagnosis..."
            placeholderTextColor={colors.textMuted}
            style={styles.textInput}
          />
        </View>

        {/* Prescription */}
        <View style={styles.sectionCard}>
          <View style={styles.rxHeaderRow}>
            <Text style={styles.sectionLabel}>Prescription</Text>
            <TouchableOpacity onPress={handleAddMedicine} style={styles.addMedBtn}>
              <Ionicons name="add-circle" size={16} color={colors.primary} />
              <Text style={styles.addMedText}>Add Medicine</Text>
            </TouchableOpacity>
          </View>

          {prescriptions.map((rx) => (
            <View key={rx.id} style={styles.rxItemCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rxName}>{rx.name}</Text>
                <Text style={styles.rxDetails}>
                  {rx.dosage} • {rx.frequency} • {rx.days}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleRemovePrescription(rx.id)}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Save Action */}
      <View style={styles.bottomBar}>
        <Button
          title="Save Consultation"
          onPress={handleSaveConsultation}
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: 100,
    gap: spacing.md,
  },
  doctorHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.md,
    ...shadows.sm,
  },
  doctorName: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  doctorSpecialty: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.primary,
    fontWeight: typography.fontWeights.semiBold,
    marginTop: 2,
  },
  doctorRoom: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  sectionLabel: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  patientPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.cardMuted,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  patientPillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  patientPillName: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  patientPillNameActive: {
    color: colors.primary,
  },
  patientPillUhid: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  patientPillUhidActive: {
    color: colors.primaryDark,
  },
  textArea: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 13,
    color: colors.text,
    minHeight: 85,
    textAlignVertical: 'top',
  },
  textInput: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.text,
  },
  rxHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addMedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addMedText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  rxItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardMuted,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: 8,
  },
  rxName: {
    fontSize: 13,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  rxDetails: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    ...shadows.md,
  },
});
