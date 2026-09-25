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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useApp } from '../context/AppContext';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { SearchBar } from '../components/common/SearchBar';
import { FilterTabs } from '../components/common/FilterTabs';
import { Avatar } from '../components/common/Avatar';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const DATES = [
  { day: 'Mon', date: '22 Sep' },
  { day: 'Tue', date: '23 Sep' },
  { day: 'Wed', date: '24 Sep' },
  { day: 'Thu', date: '25 Sep' },
  { day: 'Fri', date: '26 Sep' },
  { day: 'Sat', date: '27 Sep' },
];

export const AppointmentsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { appointments, setSelectedPatient, patients } = useApp();

  const [selectedDate, setSelectedDate] = useState('22 Sep');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch =
      apt.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = activeTab === 'All' || apt.type === activeTab;
    return matchesSearch && matchesType;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Appointments"
        showBack
        rightAction={
          <TouchableOpacity style={styles.headerIconBtn}>
            <Ionicons name="calendar-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        }
      />

      {/* Date Horizontal Picker */}
      <View style={styles.dateSelectorContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateScroll}
        >
          {DATES.map((item) => {
            const isSelected = selectedDate === item.date;
            return (
              <TouchableOpacity
                key={item.date}
                activeOpacity={0.8}
                onPress={() => setSelectedDate(item.date)}
                style={[styles.dateCard, isSelected && styles.dateCardSelected]}
              >
                <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                  {item.day}
                </Text>
                <Text style={[styles.dateText, isSelected && styles.dateTextSelected]}>
                  {item.date}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search patient, doctor or ID..."
        />
      </View>

      <FilterTabs
        tabs={['All', 'OPD', 'IPD', 'Follow Up']}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        style={styles.filterTabs}
      />

      {/* Appointment List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {filteredAppointments.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="No Appointments Found"
            description="No scheduled appointments match your filter query."
            actionTitle="Book New Appointment"
            onActionPress={() => navigation.navigate('BookAppointment')}
          />
        ) : (
          filteredAppointments.map((apt) => {
            const patient = patients.find((p) => p.id === apt.patientId);
            return (
              <TouchableOpacity
                key={apt.id}
                style={styles.aptCard}
                activeOpacity={0.75}
                onPress={() => {
                  if (patient) {
                    setSelectedPatient(patient);
                    navigation.navigate('PatientDetails', { patientId: patient.id });
                  }
                }}
              >
                <View style={styles.timeColumn}>
                  <Text style={styles.timeText}>{apt.time}</Text>
                </View>

                <Avatar name={apt.patientName} size={42} />

                <View style={styles.detailsColumn}>
                  <Text style={styles.patientName}>{apt.patientName}</Text>
                  <Text style={styles.deptDoctorText}>
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
                />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Bottom Fixed Action Button */}
      <View style={styles.bottomBar}>
        <Button
          title="+ Book Appointment"
          onPress={() => navigation.navigate('BookAppointment')}
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateSelectorContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  dateScroll: {
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },
  dateCard: {
    width: 68,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCardSelected: {
    backgroundColor: colors.primary,
  },
  dayText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  dayTextSelected: {
    color: '#FFFFFF',
  },
  dateText: {
    fontSize: 13,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: 2,
  },
  dateTextSelected: {
    color: '#FFFFFF',
  },
  searchSection: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  filterTabs: {
    marginVertical: spacing.xs,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: 100,
    gap: spacing.sm,
  },
  aptCard: {
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
  timeColumn: {
    width: 64,
  },
  timeText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
  detailsColumn: {
    flex: 1,
  },
  patientName: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  deptDoctorText: {
    fontSize: typography.fontSizes.xs,
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
