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
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { formatCurrency } from '../utils/formatters';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const BillingScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { invoices, todayStats } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.uhid.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'All' || inv.type === activeTab;
    return matchesSearch && matchesTab;
  });

  const getInvoiceTypeIcon = (type: string) => {
    switch (type) {
      case 'REG':
        return { name: 'person-add' as const, color: '#1E6BFF', bg: '#EFF6FF' };
      case 'OPD':
        return { name: 'medkit' as const, color: '#10B981', bg: '#ECFDF5' };
      case 'IPD':
        return { name: 'bed' as const, color: '#8B5CF6', bg: '#F5F3FF' };
      case 'Pharmacy':
        return { name: 'bandage' as const, color: '#F59E0B', bg: '#FFFBEB' };
      case 'Lab':
        return { name: 'flask' as const, color: '#00B4D8', bg: '#E0F7FA' };
      default:
        return { name: 'receipt' as const, color: '#6366F1', bg: '#EEF2FF' };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Billing & Invoices"
        showBack={false}
        rightAction={
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('ReceiptTemplates')}
          >
            <Ionicons name="documents-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search patient, invoice or receipt..."
        />
      </View>

      {/* Filter Tabs */}
      <FilterTabs
        tabs={['All', 'OPD', 'IPD', 'Pharmacy', 'Lab']}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        style={styles.filterTabs}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {/* Today's Collection Card */}
        <TouchableOpacity
          style={styles.collectionCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('FinancialManagement')}
        >
          <View style={styles.collectionTopRow}>
            <View>
              <Text style={styles.collectionLabel}>Today's Collection</Text>
              <Text style={styles.collectionAmount}>
                {formatCurrency(todayStats.todayCollection)}
              </Text>
            </View>
            <View style={styles.trendBadge}>
              <Ionicons name="arrow-up" size={14} color={colors.success} />
              <Text style={styles.trendText}>15%</Text>
            </View>
          </View>
          {/* Mini collection progress bar */}
          <View style={styles.collectionBar}>
            <View style={[styles.barSegment, { flex: 4, backgroundColor: '#1E6BFF' }]} />
            <View style={[styles.barSegment, { flex: 3, backgroundColor: '#10B981' }]} />
            <View style={[styles.barSegment, { flex: 2, backgroundColor: '#F59E0B' }]} />
            <View style={[styles.barSegment, { flex: 1, backgroundColor: '#8B5CF6' }]} />
          </View>
        </TouchableOpacity>

        {/* Invoice List Items */}
        {filteredInvoices.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title="No Invoices Found"
            description="No transaction records match your search criteria."
          />
        ) : (
          filteredInvoices.map((inv) => {
            const iconConfig = getInvoiceTypeIcon(inv.type);
            return (
              <TouchableOpacity
                key={inv.id}
                style={styles.invoiceCard}
                activeOpacity={0.75}
                onPress={() =>
                  navigation.navigate('ReceiptDetail', { invoiceId: inv.id })
                }
              >
                <View style={[styles.typeIconBox, { backgroundColor: iconConfig.bg }]}>
                  <Ionicons name={iconConfig.name} size={20} color={iconConfig.color} />
                </View>

                <View style={styles.invoiceDetails}>
                  <View style={styles.invNumberRow}>
                    <Text style={styles.invNumberText}>{inv.invoiceNo}</Text>
                    <Badge
                      label={inv.status}
                      variant={inv.status === 'Paid' ? 'paid' : 'pending'}
                      size="sm"
                    />
                  </View>

                  <Text style={styles.invTitle}>{inv.title}</Text>
                  <Text style={styles.invPatientText}>{inv.patientName}</Text>
                  <Text style={styles.invMetaText}>
                    {inv.paymentMode} • {inv.date} {inv.time ? `• ${inv.time}` : ''}
                  </Text>
                </View>

                <View style={styles.rightActionColumn}>
                  <Text style={styles.invAmount}>₹{inv.amount.toLocaleString()}</Text>
                  <TouchableOpacity
                    style={styles.viewLinkBtn}
                    onPress={() =>
                      navigation.navigate('ReceiptDetail', { invoiceId: inv.id })
                    }
                  >
                    <Text style={styles.viewLinkText}>View ›</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomBar}>
        <Button
          title="+ Create Invoice / Generate Receipt"
          onPress={() => navigation.navigate('ReceiptTemplates')}
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
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
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
  collectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
    marginBottom: spacing.xs,
  },
  collectionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  collectionLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  collectionAmount: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: 2,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.success,
  },
  collectionBar: {
    height: 4,
    flexDirection: 'row',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: spacing.md,
    gap: 2,
  },
  barSegment: {
    height: '100%',
  },
  invoiceCard: {
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
  typeIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceDetails: {
    flex: 1,
  },
  invNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  invNumberText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  invTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  invPatientText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  invMetaText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  rightActionColumn: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
  },
  invAmount: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  viewLinkBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  viewLinkText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
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
