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
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { SearchBar } from '../components/common/SearchBar';
import { FilterTabs } from '../components/common/FilterTabs';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const PharmacyScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { medicines, cart, addToCart, removeFromCart, clearCart, createInvoice, selectedPatient, patients } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  const pharmacyCart = cart.filter((c) => c.type === 'medicine');
  const cartTotal = pharmacyCart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const cartItemsCount = pharmacyCart.reduce((sum, item) => sum + item.qty, 0);

  const filteredMedicines = medicines.filter((med) => {
    const matchesSearch =
      med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      med.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStock =
      activeTab === 'All'
        ? true
        : activeTab === 'Low Stock'
        ? med.stock < 50
        : med.stock >= 50;
    return matchesSearch && matchesStock;
  });

  const handleCheckoutBill = () => {
    if (pharmacyCart.length === 0) {
      Alert.alert('Empty Cart', 'Please add medicines to bill first.');
      return;
    }

    const patient = selectedPatient || patients[0];
    const newInvoice = createInvoice({
      type: 'Pharmacy',
      patientId: patient.id,
      amount: cartTotal,
      paymentMode: 'UPI',
      title: 'Pharmacy Bill',
      items: pharmacyCart.map((item) => ({
        description: `${item.name}`,
        qty: item.qty,
        rate: item.price,
        amount: item.price * item.qty,
      })),
    });

    clearCart();

    Alert.alert(
      'Pharmacy Bill Generated!',
      `Total: ₹${cartTotal.toFixed(2)} for ${patient.name}. Invoice #${newInvoice.invoiceNo} ready.`,
      [
        {
          text: 'View Receipt',
          onPress: () =>
            navigation.navigate('ReceiptDetail', { invoiceId: newInvoice.id }),
        },
        { text: 'Done', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Pharmacy"
        showBack
        rightAction={
          <View style={styles.cartIconWrapper}>
            <Ionicons name="cart-outline" size={22} color={colors.text} />
            {cartItemsCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartItemsCount}</Text>
              </View>
            )}
          </View>
        }
      />

      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search medicine..."
        />
      </View>

      <FilterTabs
        tabs={['All', 'In Stock', 'Low Stock']}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        style={styles.filterTabs}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {filteredMedicines.length === 0 ? (
          <EmptyState
            icon="medkit-outline"
            title="No Medicines Found"
            description="Try searching with a different chemical or brand name."
          />
        ) : (
          filteredMedicines.map((med) => {
            const inCart = pharmacyCart.find((ci) => ci.id === med.id);
            const isLowStock = med.stock < 40;

            return (
              <View key={med.id} style={styles.medicineCard}>
                <View style={styles.medIconBox}>
                  <Ionicons name="medkit" size={22} color="#0D9488" />
                </View>

                <View style={styles.medInfo}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <View style={styles.metaRow}>
                    <Text
                      style={[
                        styles.stockText,
                        isLowStock && styles.stockTextLow,
                      ]}
                    >
                      Stock: {med.stock} {med.dosageForm}s
                    </Text>
                    <Text style={styles.dot}>•</Text>
                    <Text style={styles.expiryText}>Exp: {med.expiry}</Text>
                  </View>
                  <Text style={styles.medPrice}>₹{med.price.toFixed(2)}</Text>
                </View>

                {inCart ? (
                  <View style={styles.qtyControl}>
                    <TouchableOpacity
                      onPress={() => removeFromCart(med.id)}
                      style={styles.qtyBtn}
                    >
                      <Ionicons name="remove" size={16} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{inCart.qty}</Text>
                    <TouchableOpacity
                      onPress={() =>
                        addToCart({
                          id: med.id,
                          type: 'medicine',
                          name: med.name,
                          price: med.price,
                        })
                      }
                      style={styles.qtyBtn}
                    >
                      <Ionicons name="add" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() =>
                      addToCart({
                        id: med.id,
                        type: 'medicine',
                        name: med.name,
                        price: med.price,
                      })
                    }
                  >
                    <Ionicons name="add" size={16} color={colors.primary} />
                    <Text style={styles.addBtnText}>Add</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Bottom Add to Bill Bar */}
      <View style={styles.bottomBar}>
        <Button
          title={
            cartItemsCount > 0
              ? `+ Add to Bill (${cartItemsCount} items • ₹${cartTotal.toFixed(2)})`
              : '+ Add to Bill'
          }
          onPress={handleCheckoutBill}
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
  cartIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardMuted,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
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
  medicineCard: {
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
  medIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  stockText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  stockTextLow: {
    color: colors.danger,
    fontWeight: '600',
  },
  dot: {
    marginHorizontal: 4,
    color: colors.textMuted,
  },
  expiryText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  medPrice: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
    marginTop: 4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  qtyBtn: {
    padding: 8,
  },
  qtyText: {
    fontSize: 13,
    fontWeight: typography.fontWeights.bold,
    paddingHorizontal: 6,
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
    ...shadows.md,
  },
});
