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
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { FilterTabs } from '../components/common/FilterTabs';
import { Button } from '../components/common/Button';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CHART_BARS = [
  { label: 'Mon', value: 45, display: '4.5L' },
  { label: 'Tue', value: 68, display: '6.8L' },
  { label: 'Wed', value: 54, display: '5.4L' },
  { label: 'Thu', value: 82, display: '8.2L' },
  { label: 'Fri', value: 95, display: '9.5L' },
  { label: 'Sat', value: 78, display: '7.8L' },
  { label: 'Sun', value: 60, display: '6.0L' },
];

export const FinancialManagementScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [activePeriod, setActivePeriod] = useState('Today');

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Financial Management" showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Total Revenue Header */}
        <View style={styles.revenueHeaderCard}>
          <Text style={styles.revenueLabel}>Total Revenue</Text>
          <Text style={styles.revenueAmount}>₹48,25,000</Text>
          <View style={styles.trendRow}>
            <Ionicons name="arrow-up" size={14} color={colors.success} />
            <Text style={styles.trendText}>+12% vs last month</Text>
          </View>
        </View>

        {/* Time Filter Tabs */}
        <FilterTabs
          tabs={['Today', 'This Week', 'This Month']}
          activeTab={activePeriod}
          onSelectTab={setActivePeriod}
          scrollable={false}
          style={styles.timeTabs}
        />

        {/* Breakdown Grid */}
        <View style={styles.breakdownGrid}>
          <View style={styles.breakdownCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>OPD Collection</Text>
              <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="medkit" size={16} color="#1E6BFF" />
              </View>
            </View>
            <Text style={styles.cardValue}>₹8,45,000</Text>
            <Text style={styles.cardSub}>124 Consultations</Text>
          </View>

          <View style={styles.breakdownCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>IPD Collection</Text>
              <View style={[styles.iconBox, { backgroundColor: '#F5F3FF' }]}>
                <Ionicons name="bed" size={16} color="#8B5CF6" />
              </View>
            </View>
            <Text style={styles.cardValue}>₹22,40,000</Text>
            <Text style={styles.cardSub}>18 In-Patients</Text>
          </View>

          <View style={styles.breakdownCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>Pharmacy</Text>
              <View style={[styles.iconBox, { backgroundColor: '#FFFBEB' }]}>
                <Ionicons name="fitness" size={16} color="#F59E0B" />
              </View>
            </View>
            <Text style={styles.cardValue}>₹6,10,000</Text>
            <Text style={styles.cardSub}>342 Prescriptions</Text>
          </View>

          <View style={styles.breakdownCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>Lab & Radiology</Text>
              <View style={[styles.iconBox, { backgroundColor: '#F0FDFA' }]}>
                <Ionicons name="flask" size={16} color="#0D9488" />
              </View>
            </View>
            <Text style={styles.cardValue}>₹5,20,000</Text>
            <Text style={styles.cardSub}>88 Diagnostic Tests</Text>
          </View>
        </View>

        {/* Revenue Visual Bar Chart Card */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Weekly Revenue Trend</Text>
          <View style={styles.chartContainer}>
            {CHART_BARS.map((item, idx) => (
              <View key={idx} style={styles.barColumn}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: `${item.value}%` },
                      item.value === 95 && styles.barFillHighest,
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* View Full Report Button */}
        <View style={styles.bottomBtnArea}>
          <Button
            title="View Full Report"
            onPress={() => navigation.navigate('Reports')}
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
  revenueHeaderCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.base,
    ...shadows.sm,
  },
  revenueLabel: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  revenueAmount: {
    fontSize: 30,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.text,
    marginVertical: 4,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.success,
  },
  timeTabs: {
    marginBottom: spacing.base,
  },
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.base,
  },
  breakdownCard: {
    width: '47.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
    flex: 1,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardValue: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginVertical: 4,
  },
  cardSub: {
    fontSize: 10,
    color: colors.textMuted,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  chartTitle: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    paddingTop: 10,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    width: 24,
    height: 100,
    backgroundColor: colors.cardMuted,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#93C5FD',
    borderRadius: 6,
  },
  barFillHighest: {
    backgroundColor: colors.primary,
  },
  barLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 6,
  },
  bottomBtnArea: {
    marginTop: spacing.xs,
  },
});
