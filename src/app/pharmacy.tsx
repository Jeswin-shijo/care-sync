import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { LOW_STOCK_THRESHOLD } from '../data/mockData';
import type { Invoice, Medicine, Patient } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { expiresSoon, isExpired } from '../logic/hospital';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { SearchBar } from '../components/common/SearchBar';
import { EmptyState } from '../components/common/EmptyState';
import { PatientPicker, PatientSelectorBar } from '../components/common/PatientPicker';
import { FadeInView, stagger } from '../components/common/Motion';
import { KeyboardAwareContainer, formScrollProps, useKeyboardHeight } from '../components/common/KeyboardAware';
import { useBottomBarSpace } from '../components/common/BottomActionBar';
import { CountTabs } from '../components/orders/CountTabs';
import { HeaderIconButton } from '../components/orders/HeaderIconButton';
import { AddStepper } from '../components/orders/QtyStepper';
import { CartSheet } from '../components/orders/CartSheet';
import { OrderBar } from '../components/orders/OrderBar';
import { AllergyStrip } from '../components/orders/AllergyStrip';
import { plural } from '../components/orders/hooks';
import { RoleLockScreen } from '../components/orders/RoleLock';
import { canAccess } from '../logic/access';
import { formatCurrency } from '../utils/formatters';
import { monthsUntilExpiry } from '../utils/dates';

type StockTab = 'All' | 'In Stock' | 'Low Stock' | 'Expiring';
const TABS: StockTab[] = ['All', 'In Stock', 'Low Stock', 'Expiring'];

type McIcon = keyof typeof MaterialCommunityIcons.glyphMap;
const FORMS: Record<string, { icon: McIcon; color: string; bg: string }> = {
  Tab: { icon: 'pill', color: '#0D9488', bg: '#E6F7F5' },
  Cap: { icon: 'pill-multiple', color: '#EA580C', bg: '#FFF1E6' },
  Sachet: { icon: 'package-variant-closed', color: '#D97706', bg: '#FEF6E4' },
  Pen: { icon: 'needle', color: '#7C3AED', bg: '#F3EEFF' },
  Inhaler: { icon: 'spray', color: '#0284C7', bg: '#EAF6FE' },
};
const FALLBACK_FORM = { icon: 'medication-outline' as McIcon, color: colors.primary, bg: colors.primaryLight };

const unitLabel = (form: string, n: number) => (n === 1 ? form : `${form}s`);

/** Base stock decides the tab — never the cart-adjusted number, so rows don't jump while you tap. */
const inTab = (m: Medicine, tab: StockTab) => {
  switch (tab) {
    case 'In Stock':
      return m.stock > 0 && !isExpired(m);
    case 'Low Stock':
      return m.stock <= LOW_STOCK_THRESHOLD;
    case 'Expiring':
      return expiresSoon(m) || isExpired(m);
    default:
      return true;
  }
};

export default function PharmacyRoute() {
  const params = useLocalSearchParams<{ patientId?: string }>();
  const { activeRole, medicines, cart, addToCart, decrementCartItem, removeFromCart, getPatient, checkDrugsForPatient } = useApp();
  const { showToast } = useToast();
  const keyboardOpen = useKeyboardHeight() > 0;
  const barSpace = useBottomBarSpace(84);

  const [patientId, setPatientId] = useState<string | null>(() => (params.patientId && getPatient(params.patientId) ? params.patientId : null));
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<StockTab>('All');
  const [picker, setPicker] = useState(false);
  const [cartVisible, setCartVisible] = useState(false);

  const patient = getPatient(patientId) ?? null;
  const lines = cart.filter((c) => c.type === 'medicine');
  const units = lines.reduce((n, c) => n + c.qty, 0);
  const total = Math.round(lines.reduce((sum, c) => sum + c.price * c.qty, 0) * 100) / 100;
  const qtyMap = useMemo(() => new Map(lines.map((l) => [l.id, l.qty])), [cart]);

  const q = query.trim().toLowerCase();
  const searched = useMemo(
    () =>
      medicines.filter(
        (m) => !q || m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q) || m.dosageForm.toLowerCase().includes(q)
      ),
    [medicines, q]
  );
  const tabs = TABS.map((t) => ({ key: t, label: t, count: searched.filter((m) => inTab(m, t)).length }));
  const list = useMemo(() => searched.filter((m) => inTab(m, tab)), [searched, tab]);
  const lowCount = medicines.filter((m) => m.stock <= LOW_STOCK_THRESHOLD).length;

  const screenAlertsFor = (p: Patient, names: string[]) =>
    checkDrugsForPatient(p.id, names).filter((a) => a.kind === 'allergy' || a.kind === 'interaction');

  const handleAdd = useCallback(
    (med: Medicine) => {
      const firstUnit = (qtyMap.get(med.id) ?? 0) === 0;
      const res = addToCart({ id: med.id, type: 'medicine', name: med.name, price: med.price });
      if (!res.ok) {
        showToast({
          type: 'danger',
          title: res.error === 'EXPIRED' ? 'Batch expired' : 'Not enough stock',
          message:
            res.error === 'EXPIRED'
              ? `${med.name} (exp ${med.expiry}) can’t be dispensed.`
              : `Only ${med.stock} ${unitLabel(med.dosageForm, med.stock)} of ${med.name} in stock — all are in the cart.`,
        });
        return;
      }
      const alerts = firstUnit && patient ? screenAlertsFor(patient, [med.name]) : [];
      if (!alerts.length || !patient) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        return;
      }
      // Allergy / interaction for the selected patient — the warning toast brings its own haptic.
      showToast({
        type: 'warning',
        title: alerts[0].title,
        message: `${patient.name}: ${alerts[0].detail}`,
        duration: 5500,
        action: { label: 'Remove', onPress: () => removeFromCart(med.id, true) },
      });
    },
    [qtyMap, patient?.id]
  );

  const handleDecrement = useCallback((med: Medicine) => {
    Haptics.selectionAsync().catch(() => {});
    decrementCartItem(med.id);
  }, []);

  const selectPatient = (p: Patient) => {
    setPatientId(p.id);
    if (!lines.length) return;
    const alerts = screenAlertsFor(
      p,
      lines.map((l) => l.name)
    );
    if (alerts.length) {
      showToast({
        type: 'warning',
        title: `${plural(alerts.length, 'safety alert')} for ${p.name}`,
        message: `${alerts[0].title}. Review the cart before billing.`,
        duration: 5000,
        action: { label: 'Review', onPress: () => setCartVisible(true) },
      });
    }
  };

  const onBilled = (invoice: Invoice) => {
    showToast({
      title: invoice.status === 'Pending' ? 'Added to IPD bill' : 'Pharmacy bill generated',
      message: `${invoice.invoiceNo} • ${formatCurrency(invoice.amount, { decimals: 2 })} • ${invoice.patientName}`,
    });
    router.push({ pathname: '/receipt/[id]', params: { id: invoice.id } });
  };

  const header = (
    <View style={styles.headerBlock}>
      <PatientSelectorBar patient={patient} onPress={() => setPicker(true)} label="Billing to" />
      <AllergyStrip patient={patient} />
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search medicine, category or form…" style={styles.search} />
      <CountTabs tabs={tabs} active={tab} onChange={(k) => setTab(k as StockTab)} style={styles.tabs} />
    </View>
  );

  const empty = (
    <EmptyState
      icon="medkit-outline"
      title="No medicines found"
      description={q ? `Nothing in ${tab === 'All' ? 'stock' : tab.toLowerCase()} matches “${query.trim()}”.` : `No medicines are ${tab.toLowerCase()} right now.`}
      actionTitle={q || tab !== 'All' ? 'Clear filters' : undefined}
      onActionPress={
        q || tab !== 'All'
          ? () => {
              setQuery('');
              setTab('All');
            }
          : undefined
      }
    />
  );

  if (!canAccess(activeRole, 'pharmacy')) {
    return <RoleLockScreen title="Pharmacy" module="pharmacy" purpose="Dispensing and billing medicines" />;
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header
        title="Pharmacy"
        subtitle={`${plural(medicines.length, 'medicine')} • ${lowCount} low stock`}
        rightAction={<HeaderIconButton icon="cart-outline" badge={units} onPress={() => setCartVisible(true)} accessibilityLabel="Open cart" />}
      />
      <KeyboardAwareContainer>
        <FlatList
          data={list}
          keyExtractor={(m) => m.id}
          renderItem={({ item, index }) => (
            <MedicineRow med={item} qty={qtyMap.get(item.id) ?? 0} index={index} onAdd={handleAdd} onDecrement={handleDecrement} />
          )}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          ItemSeparatorComponent={RowGap}
          contentContainerStyle={[styles.listContent, { paddingBottom: barSpace + spacing.base }]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          {...formScrollProps}
        />
        <OrderBar
          visible={lines.length > 0 && !keyboardOpen}
          caption={`${plural(units, 'item')} • ${patient ? patient.name : 'select a patient'}`}
          total={total}
          decimals={2}
          cta="Review & Bill"
          icon="receipt-outline"
          onPress={() => setCartVisible(true)}
        />
      </KeyboardAwareContainer>

      <PatientPicker visible={picker} onClose={() => setPicker(false)} onSelect={selectPatient} selectedId={patientId} title="Bill to patient" />
      <CartSheet
        visible={cartVisible}
        onClose={() => setCartVisible(false)}
        patient={patient}
        onPatientChange={(p) => setPatientId(p.id)}
        onBilled={onBilled}
      />
    </SafeAreaView>
  );
}

const RowGap = () => <View style={{ height: spacing.sm }} />;

interface MedicineRowProps {
  med: Medicine;
  qty: number;
  index: number;
  onAdd: (med: Medicine) => void;
  onDecrement: (med: Medicine) => void;
}

const MedicineRow = React.memo(function MedicineRow({ med, qty, index, onAdd, onDecrement }: MedicineRowProps) {
  const form = FORMS[med.dosageForm] ?? FALLBACK_FORM;
  const expired = isExpired(med);
  const soon = expiresSoon(med);
  const months = monthsUntilExpiry(med.expiry);
  const out = med.stock <= 0;
  const low = !out && med.stock <= LOW_STOCK_THRESHOLD;
  const available = Math.max(0, med.stock - qty);
  const blocked = expired ? 'Expired' : out ? 'Out of stock' : undefined;

  return (
    <FadeInView delay={index < 10 ? stagger(index, 40) : 0} offset={10}>
      <View style={[styles.card, blocked && styles.cardBlocked, qty > 0 && styles.cardInCart]}>
        <View style={[styles.formTile, { backgroundColor: form.bg }]}>
          <MaterialCommunityIcons name={form.icon} size={24} color={form.color} />
          <Text style={[styles.formText, { color: form.color }]}>{med.dosageForm.toUpperCase()}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>
            {med.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {med.category}
          </Text>
          <Text
            style={[styles.stock, (low || out) && { color: colors.warningText }, (out || (qty > 0 && available === 0)) && { color: colors.danger }]}
            numberOfLines={1}
          >
            Available: {available} {unitLabel(med.dosageForm, available)}
            {qty > 0 ? <Text style={styles.inCart}>{`  •  ${qty} in cart`}</Text> : null}
          </Text>
          <View style={styles.tags}>
            {out && <Tag label="Out of stock" tone="danger" icon="close-circle" />}
            {low && <Tag label="Low stock" tone="warning" icon="trending-down" />}
            {expired ? (
              <Tag label="Expired" tone="danger" icon="alert-circle" />
            ) : soon ? (
              <Tag label={months <= 0 ? 'Exp this month' : `Exp in ${months} mo`} tone="warning" icon="time-outline" />
            ) : (
              <Tag label={`Exp ${med.expiry}`} tone="muted" />
            )}
          </View>
        </View>
        <View style={styles.right}>
          <Text style={styles.price}>{formatCurrency(med.price, { decimals: 2 })}</Text>
          <AddStepper
            qty={qty}
            label={med.name}
            blockedReason={blocked}
            maxReached={false}
            onAdd={() => onAdd(med)}
            onIncrement={() => onAdd(med)}
            onDecrement={() => onDecrement(med)}
          />
        </View>
      </View>
    </FadeInView>
  );
});

const TAG_TONES = {
  danger: { bg: colors.dangerLight, fg: colors.dangerText },
  warning: { bg: colors.warningLight, fg: colors.warningText },
  muted: { bg: colors.cardMuted, fg: colors.textSecondary },
};

const Tag: React.FC<{ label: string; tone: keyof typeof TAG_TONES; icon?: keyof typeof Ionicons.glyphMap }> = ({ label, tone, icon }) => (
  <View style={[styles.tag, { backgroundColor: TAG_TONES[tone].bg }]}>
    {icon ? <Ionicons name={icon} size={11} color={TAG_TONES[tone].fg} /> : null}
    <Text style={[styles.tagText, { color: TAG_TONES[tone].fg }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingHorizontal: spacing.base, paddingTop: spacing.md, flexGrow: 1 },
  headerBlock: { marginBottom: spacing.xs },
  search: { marginTop: spacing.md },
  tabs: { marginTop: spacing.md, marginBottom: spacing.md },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardInCart: { borderColor: colors.primary + '55' },
  cardBlocked: { backgroundColor: '#FBFCFE' },
  formTile: { width: 52, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 2 },
  formText: { fontSize: 8.5, fontWeight: typography.fontWeights.extraBold, letterSpacing: 0.4 },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: typography.fontSizes.sm + 1, fontWeight: typography.fontWeights.bold, color: colors.text, lineHeight: 19 },
  meta: { fontSize: typography.fontSizes.xs + 0.5, color: colors.textMuted, marginTop: 1 },
  stock: { fontSize: typography.fontSizes.xs + 1, color: colors.textSecondary, marginTop: 4, fontWeight: typography.fontWeights.medium },
  inCart: { color: colors.primary, fontWeight: typography.fontWeights.bold },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.full },
  tagText: { fontSize: 10.5, fontWeight: typography.fontWeights.semiBold },
  right: { alignItems: 'flex-end', justifyContent: 'space-between' },
  price: { fontSize: typography.fontSizes.sm + 1, fontWeight: typography.fontWeights.bold, color: colors.text },
});
