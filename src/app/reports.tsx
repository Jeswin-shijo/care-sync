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
import { router } from 'expo-router';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { FilterTabs } from '../components/common/FilterTabs';

const REPORTS = [
  {
    id: 'rep-1',
    title: 'Daily Collection Report',
    description: 'View daily revenue, cash, UPI and card settlements',
    category: 'Financial',
    icon: 'cash' as const,
    color: '#10B981',
  },
  {
    id: 'rep-2',
    title: 'OPD Collection Report',
    description: 'Department-wise outpatient consultation revenue',
    category: 'Financial',
    icon: 'medkit' as const,
    color: '#1E6BFF',
  },
  {
    id: 'rep-3',
    title: 'IPD Admission Report',
    description: 'In-patient bed occupancy, admissions and discharges',
    category: 'Operational',
    icon: 'bed' as const,
    color: '#8B5CF6',
  },
  {
    id: 'rep-4',
    title: 'Pharmacy Sales Report',
    description: 'Medicine-wise dispenses, batch expiries and stock turnover',
    category: 'Financial',
    icon: 'fitness' as const,
    color: '#F59E0B',
  },
  {
    id: 'rep-5',
    title: 'Lab & Radiology Report',
    description: 'Diagnostic pathology and imaging test throughput',
    category: 'Financial',
    icon: 'flask' as const,
    color: '#0D9488',
  },
  {
    id: 'rep-6',
    title: 'Doctor Wise Report',
    description: 'Consultation volumes and doctor performance metrics',
    category: 'Operational',
    icon: 'people' as const,
    color: '#EC4899',
  },
  {
    id: 'rep-7',
    title: 'Patient Demographics Report',
    description: 'Age, gender, and geographical distribution of registered patients',
    category: 'Patient',
    icon: 'pie-chart' as const,
    color: '#6366F1',
  },
  {
    id: 'rep-8',
    title: 'Insurance & TPA Claims Report',
    description: 'Pre-auth status, settlement turnaround and pending claims',
    category: 'Patient',
    icon: 'shield-checkmark' as const,
    color: '#06B6D4',
  },
];

export default function ReportsRoute() {
  const [activeTab, setActiveTab] = useState('Financial');

  const filteredReports = REPORTS.filter(
    (rep) => activeTab === 'All' || rep.category === activeTab
  );

  const handleOpenReport = (rep: typeof REPORTS[0]) => {
    Alert.alert(
      rep.title,
      `Report data compiled for today. Would you like to export CSV or view dashboard?`,
      [
        {
          text: 'View Analytics',
          onPress: () => router.push('/financial-management'),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Reports" showBack />

      <FilterTabs
        tabs={['Financial', 'Patient', 'Operational']}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        style={styles.filterTabs}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.reportsList}>
          {filteredReports.map((rep) => (
            <TouchableOpacity
              key={rep.id}
              style={styles.reportCard}
              activeOpacity={0.75}
              onPress={() => handleOpenReport(rep)}
            >
              <View style={[styles.iconBox, { backgroundColor: rep.color + '15' }]}>
                <Ionicons name={rep.icon} size={22} color={rep.color} />
              </View>

              <View style={styles.infoCol}>
                <Text style={styles.titleText}>{rep.title}</Text>
                <Text style={styles.descText}>{rep.description}</Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  filterTabs: {
    marginVertical: spacing.sm,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing.xxl,
  },
  reportsList: {
    gap: spacing.sm,
  },
  reportCard: {
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
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
  },
  titleText: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  descText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
