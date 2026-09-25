import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useApp } from '../context/AppContext';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { Avatar } from '../components/common/Avatar';
import { Button } from '../components/common/Button';

const DEPARTMENTS = [
  'General Medicine',
  'Cardiology',
  'Orthopedics',
  'Critical Care (ICU)',
  'Neurology',
  'Pediatrics',
];

const ROOM_TYPES = ['General Ward', 'ICU', 'Private'];

export default function IpdAdmissionRoute() {
  const { patientId } = useLocalSearchParams<{ patientId?: string }>();
  const { patients, admitPatientToIPD } = useApp();

  const [selectedPatientId, setSelectedPatientId] = useState(patientId || patients[1]?.id || patients[0]?.id || '');
  const activePatient = patients.find((p) => p.id === selectedPatientId) || patients[0];

  const [admissionType, setAdmissionType] = useState<'New Admission' | 'Re-admission'>('New Admission');
  const [department, setDepartment] = useState('General Medicine');
  const [roomType, setRoomType] = useState('Private');
  const [expectedDate, setExpectedDate] = useState('22 Sep 2025');
  const [notes, setNotes] = useState('Patient requires in-patient observation and IV hydration therapy.');

  const handleAdmit = () => {
    admitPatientToIPD(activePatient.id, roomType, department, notes);

    Alert.alert(
      'Admission Confirmed',
      `${activePatient.name} admitted to ${roomType} (${department}). IPD admission advance invoice generated.`,
      [
        {
          text: 'View Billing',
          onPress: () => router.push('/(tabs)/billing'),
        },
        {
          text: 'Go to Patients',
          onPress: () => router.push('/(tabs)/patients'),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="IPD Admission" showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Selected Patient Banner */}
        <View style={styles.patientBannerCard}>
          <Avatar name={activePatient.name} size={48} />
          <View style={{ flex: 1 }}>
            <Text style={styles.patientName}>{activePatient.name}</Text>
            <Text style={styles.patientUhid}>UHID: {activePatient.uhid}</Text>
            <Text style={styles.patientDemo}>
              {activePatient.age} yrs • {activePatient.gender}
            </Text>
          </View>
        </View>

        {/* Change Patient Picker */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Select Patient</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {patients.map((p) => {
              const isSelected = selectedPatientId === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setSelectedPatientId(p.id)}
                  style={[styles.patientPill, isSelected && styles.patientPillActive]}
                >
                  <Text style={[styles.patientPillText, isSelected && styles.patientPillTextActive]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Admission Type */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Admission Type</Text>
          <View style={styles.radioRow}>
            {(['New Admission', 'Re-admission'] as const).map((type) => {
              const isSelected = admissionType === type;
              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => setAdmissionType(type)}
                  style={styles.radioItem}
                >
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                  <Text style={[styles.radioText, isSelected && styles.radioTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Department Selector */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Department</Text>
          <View style={styles.deptWrap}>
            {DEPARTMENTS.map((dept) => {
              const isSelected = department === dept;
              return (
                <TouchableOpacity
                  key={dept}
                  onPress={() => setDepartment(dept)}
                  style={[styles.deptChip, isSelected && styles.deptChipActive]}
                >
                  <Text style={[styles.deptText, isSelected && styles.deptTextActive]}>
                    {dept}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Room Type */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Room Type</Text>
          <View style={styles.roomTypeRow}>
            {ROOM_TYPES.map((room) => {
              const isSelected = roomType === room;
              return (
                <TouchableOpacity
                  key={room}
                  onPress={() => setRoomType(room)}
                  style={[styles.roomChip, isSelected && styles.roomChipActive]}
                >
                  <Ionicons
                    name={room === 'ICU' ? 'pulse' : room === 'Private' ? 'bed' : 'people'}
                    size={16}
                    color={isSelected ? '#FFFFFF' : colors.primary}
                  />
                  <Text style={[styles.roomText, isSelected && styles.roomTextActive]}>
                    {room}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Expected Date */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Expected Date</Text>
          <View style={styles.dateInputRow}>
            <TextInput
              value={expectedDate}
              onChangeText={setExpectedDate}
              placeholder="DD/MM/YYYY"
              placeholderTextColor={colors.textMuted}
              style={{ flex: 1, fontSize: 13, color: colors.text }}
            />
            <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
          </View>
        </View>

        {/* Notes */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Notes (optional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Enter clinical or admission notes"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            style={styles.textArea}
          />
        </View>
      </ScrollView>

      {/* Bottom Admit Action */}
      <View style={styles.bottomBar}>
        <Button
          title="Admit Patient"
          onPress={handleAdmit}
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
  patientBannerCard: {
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
  patientDemo: {
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
    marginBottom: 8,
  },
  patientPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.cardMuted,
    marginRight: 8,
  },
  patientPillActive: {
    backgroundColor: colors.primary,
  },
  patientPillText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: typography.fontWeights.medium,
  },
  patientPillTextActive: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeights.bold,
  },
  radioRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: 4,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  radioText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  radioTextActive: {
    color: colors.text,
    fontWeight: typography.fontWeights.bold,
  },
  deptWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  deptChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.cardMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deptChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  deptText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: typography.fontWeights.medium,
  },
  deptTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  roomTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  roomChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.cardMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roomChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roomText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.medium,
    color: colors.text,
  },
  roomTextActive: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeights.bold,
  },
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginTop: 4,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 13,
    color: colors.text,
    minHeight: 70,
    textAlignVertical: 'top',
    marginTop: 4,
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
