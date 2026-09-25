import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useApp } from '../context/AppContext';
import { LabTest } from '../data/mockData';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { SearchBar } from '../components/common/SearchBar';
import { FilterTabs } from '../components/common/FilterTabs';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const LabPathologyScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { labTests, createInvoice, selectedPatient, patients } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [selectedTests, setSelectedTests] = useState<string[]>([]);

  const filteredTests = labTests.filter((test) => {
    const matchesSearch =
      test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'All' || test.category === activeTab;
    return matchesSearch && matchesTab;
  });

  const toggleTest = (id: string) => {
    setSelectedTests((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedTotal = labTests
    .filter((t) => selectedTests.includes(t.id))
    .reduce((sum, t) => sum + t.price, 0);

  const handleBookTests = () => {
    if (selectedTests.length === 0) {
      Alert.alert('Select Tests', 'Please select at least one laboratory test to book.');
      return;
    }

    const patient = selectedPatient || patients[0];
    const items = labTests
      .filter((t) => selectedTests.includes(t.id))
      .map((t) => ({ description: t.name, qty: 1, amount: t.price }));

    const invoice = createInvoice({
      type: 'Lab',
      patientId: patient.id,
      amount: selectedTotal,
      paymentMode: 'UPI',
      title: 'Laboratory Diagnostic Bill',
      items,
    });

    setSelectedTests([]);

    Alert.alert(
      'Lab Tests Booked!',
      `${items.length} diagnostic test(s) booked for ${patient.name}. Sample collection requisition dispatched.`,
      [
        {
          text: 'View Lab Receipt',
          onPress: () => navigation.navigate('ReceiptDetail', { invoiceId: invoice.id }),
        },
        { text: 'Done', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header title="Lab / Pathology" showBack />

      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search test name or category..."
        />
      </View>

      <FilterTabs
        tabs={['All', 'Biochemistry', 'Hematology', 'Pathology']}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        style={styles.filterTabs}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {filteredTests.length === 0 ? (
          <EmptyState
            icon="flask-outline"
            title="No Lab Tests Found"
            description="No diagnostics match your search query."
          />
        ) : (
          filteredTests.map((test) => {
            const isSelected = selectedTests.includes(test.id);
            return (
              <TouchableOpacity
                key={test.id}
                style={[styles.testCard, isSelected && styles.testCardActive]}
                activeOpacity={0.8}
                onPress={() => toggleTest(test.id)}
              >
                <View style={[styles.iconBox, isSelected && styles.iconBoxActive]}>
                  <Ionicons
                    name="flask"
                    size={20}
                    color={isSelected ? '#FFFFFF' : '#EC4899'}
                  />
                </View>

                <View style={styles.testInfo}>
                  <Text style={styles.testName}>{test.name}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.categoryText}>{test.category}</Text>
                    <Text style={styles.dot}>•</Text>
                    <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                    <Text style={styles.timeText}>{test.turnaroundTime}</Text>
                  </View>
                </View>

                <View style={styles.priceColumn}>
                  <Text style={styles.priceText}>₹{test.price}</Text>
                  <View
                    style={[
                      styles.checkbox,
                      isSelected && styles.checkboxActive,
                    ]}
                  >
                    {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Bottom Booking Button */}
      <View style={styles.bottomBar}>
        <Button
          title={
            selectedTests.length > 0
              ? `Book ${selectedTests.length} Test(s) • ₹${selectedTotal}`
              : 'Book Test'
          }
          onPress={handleBookTests}
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
  testCard: {
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
  testCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#F8FAFF',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: '#FDF2F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxActive: {
    backgroundColor: colors.primary,
  },
  testInfo: {
    flex: 1,
  },
  testName: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  categoryText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  dot: {
    color: colors.textMuted,
  },
  timeText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  priceColumn: {
    alignItems: 'flex-end',
    gap: 6,
  },
  priceText: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
