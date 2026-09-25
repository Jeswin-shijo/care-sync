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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useApp } from '../context/AppContext';
import { RadiologyScan } from '../data/mockData';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { SearchBar } from '../components/common/SearchBar';
import { FilterTabs } from '../components/common/FilterTabs';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const RadiologyScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { radiologyScans, createInvoice, selectedPatient, patients } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);

  const filteredScans = radiologyScans.filter((scan) => {
    const matchesSearch =
      scan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scan.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'All' || scan.category === activeTab;
    return matchesSearch && matchesTab;
  });

  const selectedScan = radiologyScans.find((s) => s.id === selectedScanId);

  const handleBookScan = () => {
    if (!selectedScan) {
      Alert.alert('Select Scan', 'Please select a radiology imaging scan to book.');
      return;
    }

    const patient = selectedPatient || patients[0];
    const invoice = createInvoice({
      type: 'Radiology',
      patientId: patient.id,
      amount: selectedScan.price,
      paymentMode: 'UPI',
      title: 'Radiology Imaging Invoice',
      items: [{ description: selectedScan.name, qty: 1, amount: selectedScan.price }],
    });

    setSelectedScanId(null);

    Alert.alert(
      'Radiology Scan Booked!',
      `${selectedScan.name} scheduled for ${patient.name}. Radiology requisition invoice generated.`,
      [
        {
          text: 'View Receipt',
          onPress: () => navigation.navigate('ReceiptDetail', { invoiceId: invoice.id }),
        },
        { text: 'Done', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Radiology" showBack />

      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search scan..."
        />
      </View>

      <FilterTabs
        tabs={['All', 'X-Ray', 'CT Scan', 'MRI', 'Ultrasound']}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        style={styles.filterTabs}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {filteredScans.length === 0 ? (
          <EmptyState
            icon="scan-outline"
            title="No Scans Found"
            description="No imaging procedures match your query."
          />
        ) : (
          filteredScans.map((scan) => {
            const isSelected = selectedScanId === scan.id;
            return (
              <TouchableOpacity
                key={scan.id}
                style={[styles.scanCard, isSelected && styles.scanCardActive]}
                activeOpacity={0.8}
                onPress={() => setSelectedScanId(isSelected ? null : scan.id)}
              >
                {/* Visual scan thumbnail representation */}
                <View style={[styles.scanThumbnail, isSelected && styles.scanThumbnailActive]}>
                  <Ionicons
                    name="scan"
                    size={22}
                    color={isSelected ? '#FFFFFF' : '#6366F1'}
                  />
                </View>

                <View style={styles.scanInfo}>
                  <Text style={styles.scanName}>{scan.name}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.categoryText}>{scan.category}</Text>
                    <Text style={styles.dot}>•</Text>
                    <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                    <Text style={styles.durationText}>{scan.duration}</Text>
                  </View>
                </View>

                <View style={styles.priceColumn}>
                  <Text style={styles.priceText}>₹{scan.price.toLocaleString()}</Text>
                  <View style={[styles.selectRadio, isSelected && styles.selectRadioActive]}>
                    {isSelected && <View style={styles.radioDot} />}
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
            selectedScan
              ? `Book ${selectedScan.name} • ₹${selectedScan.price.toLocaleString()}`
              : 'Book Scan'
          }
          onPress={handleBookScan}
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
  scanCard: {
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
  scanCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#F8FAFF',
  },
  scanThumbnail: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanThumbnailActive: {
    backgroundColor: colors.primary,
  },
  scanInfo: {
    flex: 1,
  },
  scanName: {
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
  durationText: {
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
  selectRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectRadioActive: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
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
