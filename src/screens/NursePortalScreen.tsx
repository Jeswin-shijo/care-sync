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
import { useApp } from '../context/AppContext';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { Badge } from '../components/common/Badge';

export const NursePortalScreen: React.FC = () => {
  const { nurseTasks, toggleNurseTask, wardInfo, patients } = useApp();

  const [activeFilter, setActiveFilter] = useState<'All' | 'Pending' | 'Completed'>('All');
  const [showLogModal, setShowLogModal] = useState(false);
  const [logPatient, setLogPatient] = useState('Vikram K (Ward A - Bed 14)');
  const [bpValue, setBpValue] = useState('120/80');
  const [pulseValue, setPulseValue] = useState('78');
  const [spo2Value, setSpo2Value] = useState('99%');
  const [tempValue, setTempValue] = useState('98.6°F');

  const totalBeds = wardInfo.reduce((sum, w) => sum + w.totalBeds, 0);
  const occupiedBeds = wardInfo.reduce((sum, w) => sum + w.occupied, 0);
  const availableBeds = wardInfo.reduce((sum, w) => sum + w.available, 0);

  const filteredTasks = nurseTasks.filter((t) => {
    if (activeFilter === 'Pending') return !t.completed;
    if (activeFilter === 'Completed') return t.completed;
    return true;
  });

  const handleSaveVitals = () => {
    Alert.alert(
      'Vitals Recorded & Synced',
      `Vitals for ${logPatient} logged successfully:\nBP: ${bpValue} | Pulse: ${pulseValue} bpm | SpO2: ${spo2Value} | Temp: ${tempValue}\nSynced to Doctor EMR and Central Monitoring.`,
      [{ text: 'OK', onPress: () => setShowLogModal(false) }]
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header
        title="MediOS AI Nurse Portal"
        subtitle="Bed Management, Vitals & Shift Tasks"
        showBack
        rightAction={
          <TouchableOpacity
            style={styles.logVitalsHeaderBtn}
            onPress={() => setShowLogModal(!showLogModal)}
            activeOpacity={0.8}
          >
            <Ionicons name="pulse" size={16} color="#FFFFFF" />
            <Text style={styles.logVitalsHeaderBtnText}>Log Vitals</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Ward Overview KPI Cards (Directly matching Diagram 1) */}
        <Text style={styles.sectionHeader}>Hospital Ward Overview</Text>
        <View style={styles.kpiContainer}>
          <View style={[styles.kpiCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
            <Text style={styles.kpiLabel}>Total Beds</Text>
            <Text style={[styles.kpiValue, { color: '#1E40AF' }]}>250</Text>
            <Text style={styles.kpiSub}>Capacity</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
            <Text style={styles.kpiLabel}>Occupied</Text>
            <Text style={[styles.kpiValue, { color: '#DC2626' }]}>187</Text>
            <Text style={styles.kpiSub}>74.8% Full</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
            <Text style={styles.kpiLabel}>Available</Text>
            <Text style={[styles.kpiValue, { color: '#16A34A' }]}>63</Text>
            <Text style={styles.kpiSub}>Ready for Admit</Text>
          </View>
        </View>

        {/* Detailed Ward Breakdown */}
        <View style={styles.wardListCard}>
          {wardInfo.map((w) => (
            <View key={w.id} style={styles.wardItem}>
              <View style={styles.wardIconCircle}>
                <Ionicons
                  name={w.type === 'ICU' ? 'heart' : w.type === 'Deluxe' ? 'star' : 'bed'}
                  size={16}
                  color={w.type === 'ICU' ? colors.danger : colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.wardName}>{w.name}</Text>
                <Text style={styles.wardDetail}>
                  {w.occupied} Occupied • {w.available} Available
                </Text>
              </View>
              <Badge
                label={`${w.available} Free`}
                variant={w.available <= 2 ? 'warning' : 'active'}
              />
            </View>
          ))}
        </View>

        {/* Quick Log Vitals Form when toggled */}
        {showLogModal && (
          <View style={styles.vitalsModalCard}>
            <View style={styles.vitalsModalHeader}>
              <Ionicons name="fitness" size={18} color={colors.primary} />
              <Text style={styles.vitalsModalTitle}>Quick Record Vitals</Text>
            </View>
            <Text style={styles.inputLabel}>Patient & Bed</Text>
            <TextInput
              style={styles.textInput}
              value={logPatient}
              onChangeText={setLogPatient}
            />

            <View style={styles.vitalInputsRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Blood Pressure</Text>
                <TextInput
                  style={styles.textInput}
                  value={bpValue}
                  onChangeText={setBpValue}
                  placeholder="120/80"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Pulse (bpm)</Text>
                <TextInput
                  style={styles.textInput}
                  value={pulseValue}
                  onChangeText={setPulseValue}
                  placeholder="78"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.vitalInputsRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>SpO2</Text>
                <TextInput
                  style={styles.textInput}
                  value={spo2Value}
                  onChangeText={setSpo2Value}
                  placeholder="99%"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Temperature</Text>
                <TextInput
                  style={styles.textInput}
                  value={tempValue}
                  onChangeText={setTempValue}
                  placeholder="98.6°F"
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.saveVitalsBtn}
              onPress={handleSaveVitals}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
              <Text style={styles.saveVitalsBtnText}>Save & Notify Doctor</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Today's Shift Tasks (Diagram 1 Checklist) */}
        <View style={styles.taskHeaderRow}>
          <Text style={styles.sectionHeader}>Today's Shift Tasks</Text>
          <View style={styles.filterPillRow}>
            {(['All', 'Pending', 'Completed'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterPill, activeFilter === f && styles.filterPillActive]}
                onPress={() => setActiveFilter(f)}
              >
                <Text style={[styles.filterPillText, activeFilter === f && styles.filterPillTextActive]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.tasksList}>
          {filteredTasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={[styles.taskCard, task.completed && styles.taskCardCompleted]}
              onPress={() => toggleNurseTask(task.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, task.completed && styles.checkboxCompleted]}>
                {task.completed && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.taskTitleRow}>
                  <Text
                    style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]}
                  >
                    {task.title}
                  </Text>
                  <Badge
                    label={task.priority}
                    variant={task.priority === 'High' ? 'danger' : 'warning'}
                  />
                </View>
                <Text style={styles.taskPatient}>
                  Patient: {task.patientName} • {task.ward}
                </Text>
                {task.notes && <Text style={styles.taskNotes}>{task.notes}</Text>}
                <View style={styles.taskFooter}>
                  <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.taskTime}>Due: {task.timeDue}</Text>
                  <Text style={styles.statusHint}>
                    {task.completed ? '• Completed' : '• Tap to mark done'}
                  </Text>
                </View>
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
  logVitalsHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  logVitalsHeaderBtnText: {
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
  kpiContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  kpiCard: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.sm + 2,
    borderWidth: 1,
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: typography.fontWeights.extraBold,
    marginVertical: 2,
  },
  kpiSub: {
    fontSize: 10,
    color: colors.textMuted,
  },
  wardListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.sm,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  wardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: spacing.sm,
  },
  wardIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wardName: {
    fontSize: 13,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  wardDetail: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  vitalsModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  vitalsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  vitalsModalTitle: {
    fontSize: 13,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: 12,
    color: colors.text,
  },
  vitalInputsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  saveVitalsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: radius.md,
    marginTop: spacing.md,
    gap: 6,
  },
  saveVitalsBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
  },
  taskHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  filterPillRow: {
    flexDirection: 'row',
    gap: 4,
  },
  filterPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  filterPillActive: {
    backgroundColor: colors.primary,
  },
  filterPillText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeights.bold,
  },
  tasksList: {
    gap: spacing.sm,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  taskCardCompleted: {
    backgroundColor: '#F8FAFC',
    opacity: 0.75,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  taskPatient: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  taskNotes: {
    fontSize: 11,
    color: colors.textMuted,
    backgroundColor: '#F8FAFC',
    padding: 6,
    borderRadius: 4,
    marginBottom: 4,
  },
  taskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  taskTime: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.medium,
  },
  statusHint: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: typography.fontWeights.medium,
  },
});
