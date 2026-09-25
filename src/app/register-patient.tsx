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
import { router } from 'expo-router';
import { useApp } from '../context/AppContext';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { Button } from '../components/common/Button';

const STEPS = ['Personal', 'Contact', 'Medical', 'Summary'];
const GENDERS: Array<'Male' | 'Female' | 'Other'> = ['Male', 'Female', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export default function RegisterPatientRoute() {
  const { addPatient, setSelectedPatient } = useApp();

  const [currentStep, setCurrentStep] = useState(0);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('14 Apr 1993');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Female');
  const [address, setAddress] = useState('');
  const [bloodGroup, setBloodGroup] = useState('B+');
  const [insurance, setInsurance] = useState('Star Health (Active)');

  const handleNext = () => {
    if (currentStep === 0) {
      if (!fullName.trim()) {
        Alert.alert('Validation Error', 'Please enter patient full name');
        return;
      }
      setCurrentStep(1);
    } else if (currentStep === 1) {
      if (!phone.trim()) {
        Alert.alert('Validation Error', 'Please enter a valid phone number');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else {
      const age = 32;
      const newPat = addPatient({
        name: fullName,
        phone: phone.startsWith('+91') ? phone : `+91 ${phone}`,
        dob,
        gender,
        address: address || 'Kochi, Kerala',
        bloodGroup,
        insurance: insurance || 'Self Pay',
        status: 'Active',
        age,
      });

      setSelectedPatient(newPat);
      Alert.alert(
        'Patient Registered!',
        `${newPat.name} registered with UHID: ${newPat.uhid}. Registration fee receipt ₹500 generated.`,
        [
          {
            text: 'View Profile',
            onPress: () =>
              router.replace({
                pathname: '/patient/[id]',
                params: { id: newPat.id },
              }),
          },
          {
            text: 'View Receipt',
            onPress: () => router.replace('/(tabs)/billing'),
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header title="Register Patient" showBack />

      {/* Stepper Bar */}
      <View style={styles.stepperContainer}>
        {STEPS.map((step, index) => {
          const isDone = index < currentStep;
          const isCurrent = index === currentStep;
          return (
            <React.Fragment key={step}>
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    isDone && styles.stepCircleDone,
                    isCurrent && styles.stepCircleCurrent,
                  ]}
                >
                  {isDone ? (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  ) : (
                    <Text
                      style={[
                        styles.stepNumber,
                        isCurrent && styles.stepNumberCurrent,
                      ]}
                    >
                      {index + 1}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    (isCurrent || isDone) && styles.stepLabelActive,
                  ]}
                >
                  {step}
                </Text>
              </View>
              {index < STEPS.length - 1 && (
                <View
                  style={[
                    styles.stepLine,
                    isDone && styles.stepLineActive,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Step 1: Personal Details */}
        {currentStep === 0 && (
          <View style={styles.formCard}>
            <Text style={styles.formSectionTitle}>Personal Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter patient name"
                placeholderTextColor={colors.textMuted}
                style={styles.textInput}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Date of Birth *</Text>
              <View style={styles.inputWithIcon}>
                <TextInput
                  value={dob}
                  onChangeText={setDob}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.textInput, { flex: 1, borderWidth: 0 }]}
                />
                <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Gender *</Text>
              <View style={styles.genderRow}>
                {GENDERS.map((g) => {
                  const isSelected = gender === g;
                  return (
                    <TouchableOpacity
                      key={g}
                      onPress={() => setGender(g)}
                      style={[styles.genderOption, isSelected && styles.genderOptionSelected]}
                    >
                      <View
                        style={[
                          styles.radioCircle,
                          isSelected && styles.radioCircleSelected,
                        ]}
                      >
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                      <Text
                        style={[
                          styles.genderText,
                          isSelected && styles.genderTextSelected,
                        ]}
                      >
                        {g}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* Step 2: Contact Details */}
        {currentStep === 1 && (
          <View style={styles.formCard}>
            <Text style={styles.formSectionTitle}>Contact Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number *</Text>
              <View style={styles.phoneInputRow}>
                <View style={styles.countryCodeBadge}>
                  <Text style={styles.flagEmoji}>🇮🇳</Text>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter mobile number"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  style={[styles.textInput, { flex: 1 }]}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Address</Text>
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="Enter residential address"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
              />
            </View>
          </View>
        )}

        {/* Step 3: Medical & Insurance */}
        {currentStep === 2 && (
          <View style={styles.formCard}>
            <Text style={styles.formSectionTitle}>Medical & Insurance</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Blood Group</Text>
              <View style={styles.bloodGroupRow}>
                {BLOOD_GROUPS.map((bg) => {
                  const isSelected = bloodGroup === bg;
                  return (
                    <TouchableOpacity
                      key={bg}
                      onPress={() => setBloodGroup(bg)}
                      style={[styles.bgChip, isSelected && styles.bgChipSelected]}
                    >
                      <Text style={[styles.bgText, isSelected && styles.bgTextSelected]}>
                        {bg}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Insurance Provider</Text>
              <TextInput
                value={insurance}
                onChangeText={setInsurance}
                placeholder="e.g. Star Health / HDFC ERGO"
                placeholderTextColor={colors.textMuted}
                style={styles.textInput}
              />
            </View>
          </View>
        )}

        {/* Step 4: Summary */}
        {currentStep === 3 && (
          <View style={styles.formCard}>
            <Text style={styles.formSectionTitle}>Registration Summary</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Patient Name</Text>
              <Text style={styles.summaryValue}>{fullName}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Gender & DOB</Text>
              <Text style={styles.summaryValue}>{gender} • {dob}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Phone</Text>
              <Text style={styles.summaryValue}>{phone}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Blood Group</Text>
              <Text style={styles.summaryValue}>{bloodGroup}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Registration Fee</Text>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>₹500.00 (Standard)</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Button Bar */}
      <View style={styles.bottomBar}>
        {currentStep > 0 && (
          <Button
            title="Back"
            variant="outline"
            onPress={() => setCurrentStep((prev) => prev - 1)}
            style={{ flex: 1, marginRight: 8 }}
          />
        )}
        <Button
          title={currentStep === 3 ? 'Register Patient' : 'Next'}
          onPress={handleNext}
          style={{ flex: currentStep > 0 ? 2 : 1 }}
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
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  stepItem: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepCircleCurrent: {
    backgroundColor: colors.primary,
  },
  stepCircleDone: {
    backgroundColor: colors.success,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
  stepNumberCurrent: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.medium,
  },
  stepLabelActive: {
    color: colors.text,
    fontWeight: typography.fontWeights.bold,
  },
  stepLine: {
    width: 24,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 4,
    marginBottom: 16,
  },
  stepLineActive: {
    backgroundColor: colors.success,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: 100,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  formSectionTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.base,
  },
  inputGroup: {
    marginBottom: spacing.base,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.fontSizes.sm,
    color: colors.text,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingRight: spacing.md,
    backgroundColor: '#FFFFFF',
  },
  genderRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  genderOptionSelected: {},
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  genderText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  genderTextSelected: {
    color: colors.text,
    fontWeight: typography.fontWeights.bold,
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    backgroundColor: colors.cardMuted,
  },
  flagEmoji: {
    fontSize: 14,
  },
  countryCodeText: {
    fontSize: 13,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  bloodGroupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bgChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.cardMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bgChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  bgText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: typography.fontWeights.medium,
  },
  bgTextSelected: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeights.bold,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
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
    flexDirection: 'row',
    ...shadows.md,
  },
});
