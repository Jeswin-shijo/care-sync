import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useApp } from '../context/AppContext';
import { Doctor } from '../data/mockData';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { SearchBar } from '../components/common/SearchBar';
import { Avatar } from '../components/common/Avatar';
import { Button } from '../components/common/Button';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SPECIALTIES = [
  { id: '1', name: 'General Medicine', icon: 'medical' as const, color: '#1E6BFF' },
  { id: '2', name: 'Cardiology', icon: 'heart' as const, color: '#EF4444' },
  { id: '3', name: 'Orthopedics', icon: 'body' as const, color: '#F59E0B' },
  { id: '4', name: 'Gynecology', icon: 'woman' as const, color: '#EC4899' },
  { id: '5', name: 'Pediatrics', icon: 'happy' as const, color: '#10B981' },
  { id: '6', name: 'Dermatology', icon: 'water' as const, color: '#06B6D4' },
  { id: '7', name: 'ENT', icon: 'ear' as const, color: '#8B5CF6' },
  { id: '8', name: 'Others', icon: 'apps' as const, color: '#64748B' },
];

const TIME_SLOTS = [
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '02:00 PM',
  '02:30 PM',
  '03:00 PM',
];

export const BookAppointmentScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { doctors, patients, bookAppointment } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);

  // Booking Modal State
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || '');
  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[1]);
  const [bookingDate] = useState('22 Sep 2025');

  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecialty =
      !selectedSpecialty ||
      doc.department.toLowerCase() === selectedSpecialty.toLowerCase() ||
      doc.specialty.toLowerCase().includes(selectedSpecialty.toLowerCase());
    return matchesSearch && matchesSpecialty;
  });

  const handleOpenBooking = (doc: Doctor) => {
    setSelectedDoctor(doc);
    setModalVisible(true);
  };

  const handleConfirmBooking = () => {
    if (!selectedDoctor || !selectedPatientId) return;

    bookAppointment({
      patientId: selectedPatientId,
      doctorId: selectedDoctor.id,
      department: selectedDoctor.department,
      type: 'OPD',
      date: bookingDate,
      time: selectedSlot,
    });

    setModalVisible(false);
    Alert.alert(
      'Appointment Confirmed!',
      `Booked with ${selectedDoctor.name} at ${selectedSlot} for ${bookingDate}. Consultation invoice has been generated.`,
      [
        {
          text: 'View Appointments',
          onPress: () => navigation.navigate('Appointments'),
        },
        { text: 'OK', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Book Appointment" showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Search */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search doctor, department or specialty"
          style={styles.searchBar}
        />

        {/* Specialties Grid / Carousel */}
        <Text style={styles.sectionTitle}>Specialties</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.specialtiesScroll}
        >
          {SPECIALTIES.map((spec) => {
            const isSelected = selectedSpecialty === spec.name;
            return (
              <TouchableOpacity
                key={spec.id}
                activeOpacity={0.8}
                onPress={() =>
                  setSelectedSpecialty(isSelected ? null : spec.name)
                }
                style={[
                  styles.specItem,
                  isSelected && styles.specItemSelected,
                ]}
              >
                <View
                  style={[
                    styles.specIconCircle,
                    { backgroundColor: spec.color + '15' },
                    isSelected && { backgroundColor: spec.color },
                  ]}
                >
                  <Ionicons
                    name={spec.icon}
                    size={22}
                    color={isSelected ? '#FFFFFF' : spec.color}
                  />
                </View>
                <Text
                  style={[
                    styles.specLabel,
                    isSelected && styles.specLabelSelected,
                  ]}
                  numberOfLines={1}
                >
                  {spec.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Top Doctors Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Top Doctors</Text>
          <TouchableOpacity onPress={() => setSelectedSpecialty(null)}>
            <Text style={styles.viewAllText}>View All ›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.doctorsList}>
          {filteredDoctors.map((doc) => (
            <TouchableOpacity
              key={doc.id}
              style={styles.doctorCard}
              activeOpacity={0.8}
              onPress={() => handleOpenBooking(doc)}
            >
              <Avatar name={doc.name} size={48} />

              <View style={styles.doctorInfo}>
                <View style={styles.nameRatingRow}>
                  <Text style={styles.docName}>{doc.name}</Text>
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <Text style={styles.ratingText}>{doc.rating}</Text>
                  </View>
                </View>

                <Text style={styles.docSpecialty}>{doc.specialty}</Text>

                <View style={styles.feeTimingRow}>
                  <Text style={styles.feeText}>₹{doc.fee}</Text>
                  <Text style={styles.dotSeparator}>•</Text>
                  <Text style={styles.timingText}>{doc.timing}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.bookButton}
                onPress={() => handleOpenBooking(doc)}
              >
                <Text style={styles.bookButtonText}>Book</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Booking Slot Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Appointment</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedDoctor && (
              <View style={styles.doctorSelectedBanner}>
                <Avatar name={selectedDoctor.name} size={42} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalDocName}>{selectedDoctor.name}</Text>
                  <Text style={styles.modalDocSub}>
                    {selectedDoctor.specialty} • ₹{selectedDoctor.fee}
                  </Text>
                </View>
              </View>
            )}

            {/* Select Patient */}
            <Text style={styles.inputLabel}>Select Patient</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {patients.map((p) => {
                const isSelected = selectedPatientId === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setSelectedPatientId(p.id)}
                    style={[styles.patientChip, isSelected && styles.patientChipActive]}
                  >
                    <Text style={[styles.patientChipText, isSelected && styles.patientChipTextActive]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Available Time Slots */}
            <Text style={styles.inputLabel}>Available Slots ({bookingDate})</Text>
            <View style={styles.slotsGrid}>
              {TIME_SLOTS.map((slot) => {
                const isSelected = selectedSlot === slot;
                return (
                  <TouchableOpacity
                    key={slot}
                    onPress={() => setSelectedSlot(slot)}
                    style={[styles.slotChip, isSelected && styles.slotChipActive]}
                  >
                    <Text style={[styles.slotText, isSelected && styles.slotTextActive]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Button
              title="Confirm Booking & Invoice"
              onPress={handleConfirmBooking}
              fullWidth
              size="lg"
              style={{ marginTop: 20 }}
            />
          </View>
        </View>
      </Modal>
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
  searchBar: {
    marginBottom: spacing.base,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.md + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  specialtiesScroll: {
    gap: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.lg,
  },
  specItem: {
    alignItems: 'center',
    width: 76,
  },
  specItemSelected: {
    opacity: 1,
  },
  specIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  specLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: typography.fontWeights.medium,
  },
  specLabelSelected: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  viewAllText: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.primary,
    fontWeight: typography.fontWeights.semiBold,
  },
  doctorsList: {
    gap: spacing.sm,
  },
  doctorCard: {
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
  doctorInfo: {
    flex: 1,
  },
  nameRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  docName: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  docSpecialty: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  feeTimingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  feeText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  dotSeparator: {
    color: colors.textMuted,
  },
  timingText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  bookButton: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  bookButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  doctorSelectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardMuted,
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  modalDocName: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  modalDocSub: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  patientChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.cardMuted,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  patientChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  patientChipText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: typography.fontWeights.medium,
  },
  patientChipTextActive: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeights.bold,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotChip: {
    width: '31%',
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.cardMuted,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  slotText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.medium,
    color: colors.text,
  },
  slotTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
});
