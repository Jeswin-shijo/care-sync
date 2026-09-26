import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import type { Invoice, LabSample, LabTest, Patient } from '../data/mockData';
import { useApp } from '../context/AppContext';
import type { PaymentMode } from '../context/AppContext';
import { ROLE_ACTOR } from '../logic/hospital';
import { colors, radius, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { SearchBar } from '../components/common/SearchBar';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { BottomSheet } from '../components/common/BottomSheet';
import { PatientPicker, PatientSelectorBar } from '../components/common/PatientPicker';
import { AnimatedNumber, FadeInView, stagger } from '../components/common/Motion';
import { KeyboardAwareContainer, formScrollProps, useKeyboardHeight } from '../components/common/KeyboardAware';
import { useBottomBarSpace } from '../components/common/BottomActionBar';
import { CountTabs } from '../components/orders/CountTabs';
import { SelectableRow } from '../components/orders/SelectableRow';
import { SelectionTray } from '../components/orders/SelectionTray';
import { OrderBar } from '../components/orders/OrderBar';
import { ChoiceChips } from '../components/orders/ChoiceChips';
import { BillingChoice, BillingOptions } from '../components/orders/BillingOptions';
import { AllergyStrip } from '../components/orders/AllergyStrip';
import { LinkRow, OrderSuccessCard } from '../components/orders/OrderSuccessCard';
import { HeaderIconButton } from '../components/orders/HeaderIconButton';
import { plural, shortDoctorName, useMountedRef, usePaymentModes } from '../components/orders/hooks';
import { RoleLockScreen } from '../components/orders/RoleLock';
import { canAccess } from '../logic/access';
import { formatCurrency } from '../utils/formatters';

type LabTab = 'All' | LabTest['category'];
const TABS: LabTab[] = ['All', 'Biochemistry', 'Hematology', 'Microbiology', 'Pathology'];

const CATEGORY_STYLE: Record<LabTest['category'], { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  Biochemistry: { icon: 'flask-outline', color: '#1E6BFF', bg: '#E8F1FF' },
  Hematology: { icon: 'water-outline', color: '#E11D48', bg: '#FFF1F2' },
  Microbiology: { icon: 'bug-outline', color: '#7C3AED', bg: '#F3EEFF' },
  Pathology: { icon: 'beaker-outline', color: '#0D9488', bg: '#E6F7F5' },
};

const shortName = (name: string) => name.split('(')[0].trim();

export default function LabRoute() {
  const params = useLocalSearchParams<{ patientId?: string }>();
  const { activeRole, labTests, doctors, getPatient, getLabOrders, orderLabTests } = useApp();
  const keyboardOpen = useKeyboardHeight() > 0;
  const barSpace = useBottomBarSpace(84);
  const modes = usePaymentModes();
  const mounted = useMountedRef();

  const [patientId, setPatientId] = useState<string | null>(() => (params.patientId && getPatient(params.patientId) ? params.patientId : null));
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<LabTab>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [picker, setPicker] = useState(false);

  // Confirm sheet
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetPicker, setSheetPicker] = useState(false);
  const [billing, setBilling] = useState<BillingChoice>('now');
  const [mode, setMode] = useState<PaymentMode>(modes[0]);
  const [orderedBy, setOrderedBy] = useState<string>(ROLE_ACTOR.doctor);
  const [doctorTouched, setDoctorTouched] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ invoice: Invoice; samples: LabSample[]; patient: Patient } | null>(null);

  const patient = getPatient(patientId) ?? null;
  const admitted = patient?.status === 'Admitted';

  const q = query.trim().toLowerCase();
  const searched = useMemo(
    () => labTests.filter((t) => !q || t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)),
    [labTests, q]
  );
  const tabs = TABS.map((t) => ({ key: t, label: t, count: t === 'All' ? searched.length : searched.filter((x) => x.category === t).length }));
  const visible = useMemo(() => (tab === 'All' ? searched : searched.filter((t) => t.category === tab)), [searched, tab]);

  const selectedTests = useMemo(
    () => selectedIds.map((id) => labTests.find((t) => t.id === id)).filter(Boolean) as LabTest[],
    [selectedIds, labTests]
  );
  const total = selectedTests.reduce((sum, t) => sum + t.price, 0);
  const hiddenCount = selectedTests.filter((t) => !visible.some((v) => v.id === t.id)).length;

  // Open orders for this patient, so duplicates are visible before ordering again.
  const pendingByTest = useMemo(() => {
    const map = new Map<string, LabSample>();
    if (!patient) return map;
    getLabOrders(patient.id)
      .filter((s) => s.status === 'New' || s.status === 'Processing')
      .forEach((s) => {
        if (!map.has(s.testName)) map.set(s.testName, s);
      });
    return map;
  }, [patient?.id, getLabOrders]);
  const duplicates = selectedTests.filter((t) => pendingByTest.has(t.name));

  const defaultDoctor = (p: Patient | null) =>
    p?.attendingDoctor && doctors.some((d) => d.name === p.attendingDoctor) ? p.attendingDoctor : ROLE_ACTOR.doctor;

  useEffect(() => {
    if (!admitted && billing === 'pending') setBilling('now');
    if (sheetVisible && !doctorTouched) setOrderedBy(defaultDoctor(patient));
  }, [patient?.id]);

  const toggle = (id: string) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const openConfirm = () => {
    if (!selectedTests.length) return;
    setOrderedBy(defaultDoctor(patient));
    setDoctorTouched(false);
    setBilling('now');
    setMode(modes[0]);
    setShowErrors(false);
    setResult(null);
    setSheetVisible(true);
  };

  const closeSheet = () => {
    if (submitting) return;
    setSheetVisible(false);
    setSheetPicker(false);
  };

  const placeOrder = () => {
    if (!patient || !selectedTests.length) {
      setShowErrors(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    setSubmitting(true);
    const ids = selectedTests.map((t) => t.id);
    setTimeout(() => {
      if (!mounted.current) return;
      const res = orderLabTests(patient.id, ids, { paymentMode: mode, orderedBy, status: billing === 'pending' ? 'Pending' : 'Paid' });
      setSubmitting(false);
      if (!res) {
        setShowErrors(true);
        return;
      }
      setResult({ ...res, patient });
      setSelectedIds([]);
    }, 550);
  };

  const goTo = (fn: () => void) => {
    setSheetVisible(false);
    fn();
  };

  const header = (
    <View>
      <PatientSelectorBar patient={patient} onPress={() => setPicker(true)} label="Patient" />
      <AllergyStrip patient={patient} />
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search test…" style={styles.search} />
      <CountTabs tabs={tabs} active={tab} onChange={(k) => setTab(k as LabTab)} style={styles.tabs} />
      <SelectionTray
        items={selectedTests.map((t) => ({ id: t.id, label: shortName(t.name), price: t.price }))}
        onRemove={toggle}
        onClear={() => setSelectedIds([])}
        hiddenCount={hiddenCount}
        noun="test"
      />
    </View>
  );

  const empty = (
    <EmptyState
      icon="flask-outline"
      title="No tests found"
      description={`No ${tab === 'All' ? '' : `${tab} `}test matches “${query.trim()}”.`}
      actionTitle="Clear filters"
      onActionPress={() => {
        setQuery('');
        setTab('All');
      }}
    />
  );

  const footer = result ? (
    <View style={styles.footerStack}>
      <Button
        title="Open Lab Portal"
        onPress={() => goTo(() => router.push('/lab-portal'))}
        size="lg"
        fullWidth
        icon={<Ionicons name="flask-outline" size={18} color="#FFFFFF" />}
      />
      <View style={styles.footerRow}>
        <Button
          title={result.invoice.status === 'Pending' ? 'View Bill' : 'View Receipt'}
          variant="outline"
          onPress={() => goTo(() => router.push({ pathname: '/receipt/[id]', params: { id: result.invoice.id } }))}
          style={styles.footerHalf}
        />
        <Button title="Done" variant="ghost" onPress={closeSheet} style={styles.footerHalf} />
      </View>
    </View>
  ) : selectedTests.length ? (
    <View>
      {showErrors && !patient && <Text style={styles.footerError}>Select the patient before placing the order.</Text>}
      <Button
        title={billing === 'pending' ? `Add ${formatCurrency(total)} to IPD bill` : `Place Order • ${formatCurrency(total)}`}
        onPress={placeOrder}
        loading={submitting}
        size="lg"
        fullWidth
        icon={<Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />}
      />
    </View>
  ) : undefined;

  if (!canAccess(activeRole, 'lab')) {
    return <RoleLockScreen title="Lab / Pathology" module="lab" purpose="Ordering laboratory tests" />;
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header
        title="Lab / Pathology"
        subtitle={`${plural(labTests.length, 'test')} • samples tracked in Lab Portal`}
        rightAction={<HeaderIconButton icon="file-tray-full-outline" onPress={() => router.push('/lab-portal')} accessibilityLabel="Open Lab Portal" />}
      />
      <KeyboardAwareContainer>
        <FlatList
          data={visible}
          keyExtractor={(t) => t.id}
          renderItem={({ item, index }) => {
            const style = CATEGORY_STYLE[item.category];
            const pending = pendingByTest.get(item.name);
            return (
              <FadeInView delay={index < 10 ? stagger(index, 40) : 0} offset={10}>
                <SelectableRow
                  title={item.name}
                  leading={
                    <View style={[styles.tile, { backgroundColor: style.bg }]}>
                      <Ionicons name={style.icon} size={22} color={style.color} />
                    </View>
                  }
                  meta={`${item.category} • TAT ${item.turnaroundTime}`}
                  tags={pending ? [{ label: `Pending • ${pending.sampleCode}`, tone: 'warning', icon: 'hourglass-outline' }] : undefined}
                  price={formatCurrency(item.price)}
                  selected={selectedIds.includes(item.id)}
                  onToggle={() => toggle(item.id)}
                />
              </FadeInView>
            );
          }}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          ItemSeparatorComponent={RowGap}
          extraData={selectedIds}
          contentContainerStyle={[styles.listContent, { paddingBottom: barSpace + spacing.base }]}
          showsVerticalScrollIndicator={false}
          {...formScrollProps}
        />
        <OrderBar
          visible={!keyboardOpen}
          caption={selectedTests.length ? `${plural(selectedTests.length, 'test')} selected` : 'Select tests to book'}
          total={total}
          cta={selectedTests.length ? `Book ${plural(selectedTests.length, 'Test')}` : 'Book Test'}
          disabled={!selectedTests.length}
          onPress={openConfirm}
        />
      </KeyboardAwareContainer>

      <PatientPicker visible={picker} onClose={() => setPicker(false)} onSelect={(p) => setPatientId(p.id)} selectedId={patientId} title="Order tests for" />

      <BottomSheet
        visible={sheetVisible}
        onClose={closeSheet}
        dismissible={!submitting}
        title={result ? undefined : 'Confirm Lab Order'}
        subtitle={result ? undefined : `${plural(selectedTests.length, 'test')} • ${formatCurrency(total)}`}
        footer={footer}
        maxHeight={0.92}
      >
        {result ? (
          <OrderSuccessCard
            title="Lab Order Placed"
            subtitle={`${result.patient.name} • ${plural(result.samples.length, 'sample')} awaiting collection`}
          >
            <View style={styles.samples}>
              {result.samples.map((s, i) => (
                <FadeInView key={s.id} delay={380 + stagger(i, 70)} offset={6} style={[styles.sampleRow, i === result.samples.length - 1 && styles.sampleRowLast]}>
                  <View style={styles.sampleCode}>
                    <Ionicons name="barcode-outline" size={14} color={colors.primary} />
                    <Text style={styles.sampleCodeText}>{s.sampleCode}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sampleName} numberOfLines={1}>
                      {shortName(s.testName)}
                    </Text>
                    <Text style={styles.sampleMeta} numberOfLines={1}>
                      {s.turnaroundTime}
                    </Text>
                  </View>
                </FadeInView>
              ))}
            </View>
            <View style={styles.resultMeta}>
              <Text style={styles.resultMetaText}>
                Ordered by {result.samples[0]?.orderedBy ?? orderedBy} •{' '}
                {result.invoice.status === 'Pending'
                  ? `${formatCurrency(result.invoice.amount)} added to IPD bill (Pending)`
                  : `${formatCurrency(result.invoice.amount)} paid via ${result.invoice.paymentMode}`}
              </Text>
            </View>
            <LinkRow
              icon="receipt-outline"
              title={result.invoice.status === 'Pending' ? 'View pending bill' : 'View receipt'}
              subtitle={`${result.invoice.invoiceNo} • ${formatCurrency(result.invoice.amount)}`}
              onPress={() => goTo(() => router.push({ pathname: '/receipt/[id]', params: { id: result.invoice.id } }))}
            />
          </OrderSuccessCard>
        ) : !selectedTests.length ? (
          <EmptyState icon="flask-outline" title="No tests selected" description="Pick one or more tests from the catalogue." actionTitle="Back to tests" onActionPress={closeSheet} />
        ) : (
          <View>
            <Text style={styles.label}>Patient</Text>
            <PatientSelectorBar
              patient={patient}
              onPress={() => setSheetPicker(true)}
              label="Order for"
              style={showErrors && !patient ? styles.errorBorder : undefined}
            />
            {showErrors && !patient && <Text style={styles.fieldError}>Select a patient — orders are never raised to an implicit patient.</Text>}
            <AllergyStrip patient={patient} />

            {duplicates.length > 0 && (
              <View style={styles.dupNote}>
                <Ionicons name="copy-outline" size={16} color={colors.warningText} />
                <Text style={styles.dupText}>
                  Already pending for {patient?.name.split(' ')[0]}: {duplicates.map((d) => `${shortName(d.name)} (${pendingByTest.get(d.name)?.sampleCode})`).join(', ')}. Remove it
                  below if this is a repeat order.
                </Text>
              </View>
            )}

            <Text style={styles.label}>Tests</Text>
            <View style={styles.lines}>
              {selectedTests.map((t) => (
                <View key={t.id} style={styles.line}>
                  <View style={[styles.lineDot, { backgroundColor: CATEGORY_STYLE[t.category].color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lineName} numberOfLines={2}>
                      {t.name}
                    </Text>
                    <Text style={styles.lineMeta}>
                      {t.category} • TAT {t.turnaroundTime}
                    </Text>
                  </View>
                  <Text style={styles.linePrice}>{formatCurrency(t.price)}</Text>
                  <TouchableOpacity
                    onPress={() => toggle(t.id)}
                    hitSlop={12}
                    style={styles.lineRemove}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${t.name}`}
                  >
                    <Ionicons name="close" size={15} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <AnimatedNumber value={total} duration={400} format={(n) => formatCurrency(n)} style={styles.totalValue} />
              </View>
            </View>

            <Text style={styles.label}>Ordering doctor</Text>
            <ChoiceChips<string>
              scroll
              options={doctors.map((d) => ({ value: d.name, label: shortDoctorName(d.name), sublabel: d.department, icon: 'person-circle-outline' }))}
              value={orderedBy}
              onChange={(v) => {
                setOrderedBy(v);
                setDoctorTouched(true);
              }}
              accessibilityLabel="Ordering doctor"
            />

            <Text style={styles.label}>Payment</Text>
            <BillingOptions patient={patient} billing={billing} onBillingChange={setBilling} mode={mode} onModeChange={setMode} modes={modes} />

            <PatientPicker
              visible={sheetPicker}
              onClose={() => setSheetPicker(false)}
              onSelect={(p) => setPatientId(p.id)}
              selectedId={patientId}
              title="Order tests for"
              allowRegister={false}
            />
          </View>
        )}
      </BottomSheet>
    </SafeAreaView>
  );
}

const RowGap = () => <View style={{ height: spacing.sm }} />;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingHorizontal: spacing.base, paddingTop: spacing.md, flexGrow: 1 },
  search: { marginTop: spacing.md },
  tabs: { marginTop: spacing.md, marginBottom: spacing.md },
  tile: { width: 46, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  label: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  errorBorder: { borderColor: colors.danger, borderStyle: 'solid' },
  fieldError: { color: colors.danger, fontSize: typography.fontSizes.xs + 1, marginTop: 6 },
  footerError: { color: colors.danger, fontSize: typography.fontSizes.xs + 1, marginBottom: spacing.sm, textAlign: 'center' },
  dupNote: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningLight,
  },
  dupText: { flex: 1, fontSize: typography.fontSizes.xs + 1, color: colors.warningText, lineHeight: 17 },
  lines: { borderRadius: radius.lg, backgroundColor: colors.cardMuted, paddingHorizontal: spacing.md },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lineDot: { width: 8, height: 8, borderRadius: 4 },
  lineName: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semiBold, color: colors.text },
  lineMeta: { fontSize: typography.fontSizes.xs, color: colors.textSecondary, marginTop: 2 },
  linePrice: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.bold, color: colors.text },
  lineRemove: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md },
  totalLabel: { fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.semiBold, color: colors.text },
  totalValue: { fontSize: typography.fontSizes.xl, fontWeight: typography.fontWeights.extraBold, color: colors.primary },
  samples: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: spacing.md },
  sampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sampleRowLast: { borderBottomWidth: 0 },
  sampleCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
  },
  sampleCodeText: { fontSize: typography.fontSizes.xs + 1, fontWeight: typography.fontWeights.bold, color: colors.primaryDark, letterSpacing: 0.3 },
  sampleName: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semiBold, color: colors.text },
  sampleMeta: { fontSize: typography.fontSizes.xs, color: colors.textSecondary, marginTop: 1 },
  resultMeta: { marginTop: spacing.md },
  resultMetaText: { fontSize: typography.fontSizes.xs + 1, color: colors.textSecondary, textAlign: 'center', lineHeight: 17 },
  footerStack: { gap: spacing.sm },
  footerRow: { flexDirection: 'row', gap: spacing.sm },
  footerHalf: { flex: 1 },
});
