import React from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { RoleSwitcher } from '../components/common/RoleSwitcher';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const MoreFeaturesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const modules = [
    {
      id: 'doctor-copilot',
      title: 'Doctor Copilot',
      icon: 'sparkles' as const,
      color: '#1E6BFF',
      bg: '#EFF6FF',
      onPress: () => navigation.navigate('DoctorCopilot'),
    },
    {
      id: 'nurse-portal',
      title: 'Nurse Ward',
      icon: 'fitness' as const,
      color: '#059669',
      bg: '#ECFDF5',
      onPress: () => navigation.navigate('NursePortal'),
    },
    {
      id: 'pharmacy-review',
      title: 'Drug Safety Review',
      icon: 'shield-checkmark' as const,
      color: '#D97706',
      bg: '#FFFBEB',
      onPress: () => navigation.navigate('PharmacyReview'),
    },
    {
      id: 'lab-portal',
      title: 'Lab Sample Portal',
      icon: 'flask' as const,
      color: '#7C3AED',
      bg: '#F5F3FF',
      onPress: () => navigation.navigate('LabPortal'),
    },
    {
      id: 'patient-portal',
      title: 'Patient App',
      icon: 'person' as const,
      color: '#EC4899',
      bg: '#FDF2F8',
      onPress: () => navigation.navigate('PatientPortal'),
    },
    {
      id: 'pharmacy',
      title: 'Pharmacy',
      icon: 'medkit' as const,
      color: '#0D9488',
      bg: '#F0FDFA',
      onPress: () => navigation.navigate('Pharmacy'),
    },
    {
      id: 'laboratory',
      title: 'Laboratory',
      icon: 'flask' as const,
      color: '#EC4899',
      bg: '#FDF2F8',
      onPress: () => navigation.navigate('LabPathology'),
    },
    {
      id: 'radiology',
      title: 'Radiology',
      icon: 'scan' as const,
      color: '#6366F1',
      bg: '#EEF2FF',
      onPress: () => navigation.navigate('Radiology'),
    },
    {
      id: 'bloodbank',
      title: 'Blood Bank',
      icon: 'water' as const,
      color: '#EF4444',
      bg: '#FEF2F2',
      onPress: () =>
        Alert.alert(
          'Blood Bank Inventory',
          'Current Units in Cold Storage:\n• A+ : 14 Units\n• B+ : 22 Units\n• O+ : 18 Units\n• O- : 4 Units (Critical Alert)\n• AB+ : 8 Units'
        ),
    },
    {
      id: 'ambulance',
      title: 'Ambulance',
      icon: 'car' as const,
      color: '#EF4444',
      bg: '#FFF1F2',
      onPress: () =>
        Alert.alert(
          'Ambulance Fleet Status',
          '• Unit KL-07-AW-1001: Available (Driver: Manoj K)\n• Unit KL-07-AW-1002: In Transit to Kakkanad\n• Unit KL-07-AW-1003 (ICU Mobile): Standby'
        ),
    },
    {
      id: 'beds',
      title: 'Bed\nManagement',
      icon: 'bed' as const,
      color: '#8B5CF6',
      bg: '#F5F3FF',
      onPress: () =>
        Alert.alert(
          'Bed Allocation Status',
          '• Total Beds: 30\n• Occupied: 18 (78%)\n• Available: 12\n• ICU Available: 2/8'
        ),
    },
    {
      id: 'inventory',
      title: 'Inventory',
      icon: 'cube' as const,
      color: '#10B981',
      bg: '#ECFDF5',
      onPress: () =>
        Alert.alert(
          'Medical Supplies Inventory',
          '• Syringes & Needles: 1,450 pcs\n• IV Infusion Sets: 320 pcs\n• Surgical Gloves (7.0 & 7.5): 85 boxes\n• All items within shelf life.'
        ),
    },
    {
      id: 'reports',
      title: 'Reports',
      icon: 'document-text' as const,
      color: '#F59E0B',
      bg: '#FFFBEB',
      onPress: () => navigation.navigate('Reports'),
    },
    {
      id: 'templates',
      title: 'Receipt\nTemplates',
      icon: 'receipt' as const,
      color: '#1E6BFF',
      bg: '#EFF6FF',
      onPress: () => navigation.navigate('ReceiptTemplates'),
    },
    {
      id: 'finance',
      title: 'Financial\nManagement',
      icon: 'stats-chart' as const,
      color: '#3B82F6',
      bg: '#EFF6FF',
      onPress: () => navigation.navigate('FinancialManagement'),
    },
    {
      id: 'docsupport',
      title: 'Document\nSupport',
      icon: 'document-attach' as const,
      color: '#06B6D4',
      bg: '#E0F7FA',
      onPress: () =>
        Alert.alert(
          'Document Support',
          'CareSync Document Vault supports HL7 FHIR formats, DICOM imaging links, and PDF digitally signed exports.'
        ),
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: 'settings' as const,
      color: '#64748B',
      bg: '#F1F5F9',
      onPress: () => navigation.navigate('Settings'),
    },
  ];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header title="Hospital Modules" showBack={false} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <RoleSwitcher />

        <Text style={styles.headerSubtitle}>
          Access all hospital operations, clinical modules, and administrative workflows.
        </Text>

        <View style={styles.grid}>
          {modules.map((mod) => (
            <TouchableOpacity
              key={mod.id}
              style={styles.gridItem}
              activeOpacity={0.75}
              onPress={mod.onPress}
            >
              <View style={[styles.iconCircle, { backgroundColor: mod.bg }]}>
                <Ionicons name={mod.icon} size={26} color={mod.color} />
              </View>
              <Text style={styles.itemTitle}>{mod.title}</Text>
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
    padding: spacing.base,
    paddingBottom: spacing.xxl,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.base,
    lineHeight: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '30%',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 14,
  },
});
