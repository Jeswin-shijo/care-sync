import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import type { Invoice, LabSample, Patient, RadiologyOrder, RadiologyScan } from '../data/mockData';
import { useApp } from '../context/AppContext';
import type { PaymentMode } from '../context/AppContext';
import { ROLE_ACTOR } from '../logic/hospital';
import { colors, radius, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { SearchBar } from '../components/common/SearchBar';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { Badge, statusVariant } from '../components/common/Badge';
import { BottomSheet } from '../components/common/BottomSheet';
import { PatientPicker, PatientSelectorBar } from '../components/common/PatientPicker';
import { AnimatedNumber, FadeInView, PressableScale, stagger } from '../components/common/Motion';
import { KeyboardAwareContainer, formScrollProps, useKeyboardHeight } from '../components/common/KeyboardAware';
import { useBottomBarSpace } from '../components/common/BottomActionBar';
import { CountTabs } from '../components/orders/CountTabs';
import { SelectableRow } from '../components/orders/SelectableRow';
import { SelectionTray } from '../components/orders/SelectionTray';
import { OrderBar } from '../components/orders/OrderBar';
import { ChoiceChips } from '../components/orders/ChoiceChips';
import { GridSlot, SlotGrid } from '../components/orders/SlotGrid';
import { BillingChoice, BillingOptions } from '../components/orders/BillingOptions';
import { AllergyStrip } from '../components/orders/AllergyStrip';
import { SafetyChecklist, SafetyItem, allAcknowledged } from '../components/orders/SafetyChecklist';
import { DetailRow, LinkRow, OrderSuccessCard } from '../components/orders/OrderSuccessCard';
import { HeaderIconButton } from '../components/orders/HeaderIconButton';
import { plural, shortDoctorName, useMinuteTick, useMountedRef, usePaymentModes } from '../components/orders/hooks';
import { RoleLockScreen } from '../components/orders/RoleLock';
import { canAccess } from '../logic/access';
import { formatCurrency } from '../utils/formatters';
import { clockToMinutes, formatClock, formatDayMonth, formatDisplayDate, isoDaysFromToday, relativeDayLabel, todayISO, weekdayShort } from '../utils/dates';

type RadTab = 'All' | RadiologyScan['category'];
const TABS: RadTab[] = ['All', 'X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'Mammography'];

type McIcon = keyof typeof MaterialCommunityIcons.glyphMap;

/** Artwork for a scan: body region first, modality as fallback. */
const scanIcon = (scan: Pick<RadiologyScan, 'name' | 'category'>): McIcon => {
  const n = scan.name.toLowerCase();
  if (scan.category === 'Mammography') return 'human-female';
  if (/chest|lung|hrct/.test(n)) return 'lungs';
  if (/head|brain/.test(n)) return 'skull-scan-outline';
  if (/spine|knee|bone|joint|lumbar/.test(n)) return 'bone';
  if (/abdomen/.test(n)) return 'stomach';
  if (scan.category === 'MRI') return 'magnet';
  return 'radiology-box-outline';
};

/** Department slots: 08:00 AM – 07:30 PM every 30 minutes. */
const RADIOLOGY_SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let m = 8 * 60; m <= 19 * 60 + 30; m += 30) {
    const d = new Date();
    d.setHours(Math.floor(m / 60), m % 60, 0, 0);
    out.push(formatClock(d));
  }
  return out;
})();

const latestParam = (samples: LabSample[], name: string) => {
  for (const s of samples) {
    const p = s.parameters?.find((x) => x.name.toLowerCase().startsWith(name.toLowerCase()));
    if (p) return p;
  }
  return undefined;
};

export default function RadiologyRoute() {
  const params = useLocalSearchParams<{ patientId?: string }>();
  const { activeRole, radiologyScans, radiologyOrders, doctors, getPatient, getProfile, getLabResults, getRadiologyOrders, orderRadiologyScans } = useApp();
  const keyboardOpen = useKeyboardHeight() > 0;
  const barSpace = useBottomBarSpace(84);
  const modes = usePaymentModes();
  const mounted = useMountedRef();
  const now = useMinuteTick();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const today = todayISO();

  const [patientId, setPatientId] = useState<string | null>(() => (params.patientId && getPatient(params.patientId) ? params.patientId : null));
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<RadTab>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [picker, setPicker] = useState(false);
  const [scheduleVisible, setScheduleVisible] = useState(false);

  // Confirm sheet
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetPicker, setSheetPicker] = useState(false);
  const [day, setDay] = useState(today);
  const [time, setTime] = useState<string | null>(null);
  const [billing, setBilling] = useState<BillingChoice>('now');
  const [mode, setMode] = useState<PaymentMode>(modes[0]);
  const [orderedBy, setOrderedBy] = useState<string>(ROLE_ACTOR.doctor);
  const [acked, setAcked] = useState<Record<string, boolean>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ invoice: Invoice; orders: RadiologyOrder[]; patient: Patient } | null>(null);

  const patient = getPatient(patientId) ?? null;
  const admitted = patient?.status === 'Admitted';

  const q = query.trim().toLowerCase();
  const searched = useMemo(
    () => radiologyScans.filter((s) => !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)),
    [radiologyScans, q]
  );
  const tabs = TABS.map((t) => ({ key: t, label: t, count: t === 'All' ? searched.length : searched.filter((x) => x.category === t).length }));
  const visible = useMemo(() => (tab === 'All' ? searched : searched.filter((s) => s.category === tab)), [searched, tab]);

  const selectedScans = useMemo(
    () => selectedIds.map((id) => radiologyScans.find((s) => s.id === id)).filter(Boolean) as RadiologyScan[],
    [selectedIds, radiologyScans]
  );
  const total = selectedScans.reduce((sum, s) => sum + s.price, 0);
  const hiddenCount = selectedScans.filter((s) => !visible.some((v) => v.id === s.id)).length;

  const openOrdersByScan = useMemo(() => {
    const map = new Map<string, RadiologyOrder>();
    if (!patient) return map;
    getRadiologyOrders(patient.id)
      .filter((o) => o.status !== 'Reported')
      .forEach((o) => {
        if (!map.has(o.scanName)) map.set(o.scanName, o);
      });
    return map;
  }, [patient?.id, getRadiologyOrders]);

  // ---------- Schedule ----------
  const days = [0, 1, 2].map((i) => isoDaysFromToday(i));
  const categoryKey = [...new Set(selectedScans.map((s) => s.category))].sort().join('|');
  /** Slots for a day: past (with 15 min prep) and already-booked times for the chosen modalities are closed. */
  const slotsFor = (iso: string): GridSlot[] => {
    const categories = new Set(selectedScans.map((s) => s.category));
    const taken = new Set(
      radiologyOrders
        .filter((o) => o.date === iso && (o.status === 'Scheduled' || o.status === 'In Progress') && categories.has(o.category))
        .map((o) => o.time)
    );
    return RADIOLOGY_SLOTS.map((t) => {
      if (iso === today && clockToMinutes(t) <= nowMinutes + 15) return { time: t, available: false, reason: 'past' as const };
      if (taken.has(t)) return { time: t, available: false, reason: 'booked' as const };
      return { time: t, available: true };
    });
  };
  const slots: GridSlot[] = useMemo(() => slotsFor(day), [radiologyOrders, day, today, nowMinutes, categoryKey]);

  useEffect(() => {
    if (time && !slots.some((s) => s.time === time && s.available)) setTime(null);
  }, [slots]);

  // ---------- Safety ----------
  const safetyItems: SafetyItem[] = useMemo(() => {
    if (!patient || !selectedScans.length) return [];
    const items: SafetyItem[] = [];
    const allergies = getProfile(patient.id)?.allergies ?? [];
    const contrastAllergy = allergies.find((a) => /contrast|iod/i.test(a));
    const labs = getLabResults(patient.id);
    const mri = selectedScans.filter((s) => s.category === 'MRI');
    const ct = selectedScans.filter((s) => s.category === 'CT Scan');

    if (patient.gender === 'Male' && selectedScans.some((s) => s.category === 'Mammography')) {
      items.push({
        id: 'mammo-male',
        severity: 'warning',
        title: `Mammography ordered for a male patient`,
        detail: `${patient.name} is recorded as male. Confirm the indication (e.g. gynecomastia or a palpable lump) with the ordering doctor.`,
        source: 'Radiology protocol RAD-MAM-02',
        ackLabel: 'Clinical indication confirmed',
      });
    }
    if (contrastAllergy && ct.length) {
      const plain = ct.every((s) => /plain|hrct/i.test(s.name));
      items.push({
        id: 'ct-contrast-allergy',
        severity: 'critical',
        title: `Allergy: ${contrastAllergy}`,
        detail: plain
          ? `${ct.map((s) => s.name).join(', ')} is a non-contrast study — make sure no contrast is given.`
          : 'Use a non-contrast protocol, or premedicate per the contrast-allergy protocol before injection.',
        source: 'Allergy record • ACR contrast manual',
        ackLabel: plain ? 'Non-contrast protocol confirmed' : 'Non-contrast protocol / premedication arranged',
      });
    }
    if (mri.length) {
      items.push({
        id: 'mri-implants',
        severity: 'warning',
        title: 'MRI safety screening',
        detail: 'Ask about pacemakers or ICDs, cochlear implants, aneurysm clips, metal fragments, insulin pumps and pregnancy.',
        source: 'MRI zone III screening',
        ackLabel: 'Screened — no MRI-unsafe implants',
      });
    }
    if (mri.some((s) => /contrast/i.test(s.name))) {
      const egfr = latestParam(labs, 'eGFR');
      const creat = latestParam(labs, 'Creatinine');
      const low = egfr ? egfr.value < 60 : false;
      items.push({
        id: 'mri-renal',
        severity: egfr && egfr.value < 30 ? 'critical' : low ? 'warning' : 'info',
        title: 'Gadolinium contrast — renal function',
        detail: egfr
          ? `Latest eGFR ${egfr.value} ${egfr.unit}${creat ? `, creatinine ${creat.value} ${creat.unit}` : ''}.${
              low ? ' Reduced — use the lowest dose of a group II agent or consider a plain study.' : ' Adequate for contrast.'
            }`
          : 'No recent eGFR on file — check creatinine before giving contrast.',
        source: 'Renal function • latest lab results',
        ackLabel: 'Renal function reviewed',
      });
    }
    if (
      patient.gender === 'Female' &&
      patient.age >= 12 &&
      patient.age <= 50 &&
      selectedScans.some((s) => s.category === 'X-Ray' || s.category === 'CT Scan')
    ) {
      items.push({
        id: 'pregnancy',
        severity: 'info',
        title: 'Pregnancy check',
        detail: 'Confirm pregnancy status / LMP before ionising radiation.',
        source: 'Radiation safety',
        ackLabel: 'Not pregnant (LMP confirmed)',
      });
    }
    return items;
  }, [patient?.id, selectedIds]);

  const safetyKey = safetyItems.map((i) => i.id).join('|');
  useEffect(() => {
    setAcked({});
  }, [patient?.id, safetyKey]);

  useEffect(() => {
    if (!admitted && billing === 'pending') setBilling('now');
  }, [patient?.id]);

  // ---------- Actions ----------
  const toggle = (id: string) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const firstOpenSlot = (iso: string) => slotsFor(iso).find((s) => s.available)?.time ?? null;

  const openConfirm = () => {
    if (!selectedScans.length) return;
    const startDay = firstOpenSlot(today) ? today : isoDaysFromToday(1);
    setDay(startDay);
    setTime(firstOpenSlot(startDay));
    setOrderedBy(patient?.attendingDoctor && doctors.some((d) => d.name === patient.attendingDoctor) ? patient.attendingDoctor : ROLE_ACTOR.doctor);
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

  const acksDone = allAcknowledged(safetyItems, acked);

  const confirm = () => {
    if (!patient || !time || !acksDone) {
      setShowErrors(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    setSubmitting(true);
    const ids = selectedScans.map((s) => s.id);
    setTimeout(() => {
      if (!mounted.current) return;
      const res = orderRadiologyScans(patient.id, ids, {
        paymentMode: mode,
        orderedBy,
        date: day,
        time,
        status: billing === 'pending' ? 'Pending' : 'Paid',
      });
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

  // Today's + upcoming radiology list (header action).
  const upcoming = useMemo(
    () =>
      radiologyOrders
        .filter((o) => o.date >= today && o.status !== 'Reported')
        .sort((a, b) => (a.date === b.date ? clockToMinutes(a.time) - clockToMinutes(b.time) : a.date < b.date ? -1 : 1)),
    [radiologyOrders, today]
  );
  const todayCount = upcoming.filter((o) => o.date === today).length;

  const goToPatient = (id: string) => {
    setScheduleVisible(false);
    router.push({ pathname: '/patient/[id]', params: { id } });
  };

  const header = (
    <View>
      <PatientSelectorBar patient={patient} onPress={() => setPicker(true)} label="Patient" />
      <AllergyStrip patient={patient} />
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search scan…" style={styles.search} />
      <CountTabs tabs={tabs} active={tab} onChange={(k) => setTab(k as RadTab)} style={styles.tabs} />
      <SelectionTray
        items={selectedScans.map((s) => ({ id: s.id, label: s.name, price: s.price }))}
        onRemove={toggle}
        onClear={() => setSelectedIds([])}
        hiddenCount={hiddenCount}
        noun="scan"
      />
    </View>
  );

  const footer = result ? (
    <View style={styles.footerStack}>
      <Button title="Done" onPress={closeSheet} size="lg" fullWidth />
      <View style={styles.footerRow}>
        <Button
          title={result.invoice.status === 'Pending' ? 'View Bill' : 'View Receipt'}
          variant="outline"
          onPress={() => goTo(() => router.push({ pathname: '/receipt/[id]', params: { id: result.invoice.id } }))}
          style={styles.footerHalf}
        />
        <Button
          title="Patient record"
          variant="ghost"
          onPress={() => goTo(() => router.push({ pathname: '/patient/[id]', params: { id: result.patient.id } }))}
          style={styles.footerHalf}
        />
      </View>
    </View>
  ) : selectedScans.length ? (
    <View>
      {showErrors && (!patient || !time || !acksDone) && (
        <Text style={styles.footerError}>
          {!patient ? 'Select the patient first.' : !time ? 'Pick a time slot.' : 'Complete the safety checks above.'}
        </Text>
      )}
      <Button
        title={billing === 'pending' ? `Schedule • add ${formatCurrency(total)} to IPD bill` : `Schedule & Collect ${formatCurrency(total)}`}
        onPress={confirm}
        loading={submitting}
        size="lg"
        fullWidth
        icon={<Ionicons name="calendar-outline" size={18} color="#FFFFFF" />}
      />
    </View>
  ) : undefined;

  if (!canAccess(activeRole, 'radiology')) {
    return <RoleLockScreen title="Radiology" module="radiology" purpose="Scheduling radiology scans" />;
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header
        title="Radiology"
        subtitle={`${plural(radiologyScans.length, 'scan')} • ${todayCount} scheduled today`}
        rightAction={<HeaderIconButton icon="calendar-outline" badge={todayCount} onPress={() => setScheduleVisible(true)} accessibilityLabel="Scan schedule" />}
      />
      <KeyboardAwareContainer>
        <FlatList
          data={visible}
          keyExtractor={(s) => s.id}
          renderItem={({ item, index }) => {
            const open = openOrdersByScan.get(item.name);
            return (
              <FadeInView delay={index < 10 ? stagger(index, 40) : 0} offset={10}>
                <SelectableRow
                  title={item.name}
                  leading={
                    <View style={styles.thumb}>
                      <MaterialCommunityIcons name={scanIcon(item)} size={26} color="#8FD3FF" />
                      <View style={styles.thumbGlow} />
                    </View>
                  }
                  meta={`${item.category}`}
                  tags={[
                    { label: item.duration, tone: 'muted', icon: 'time-outline' },
                    ...(open
                      ? [{ label: `Scheduled ${relativeDayLabel(open.date)} ${open.time}`, tone: 'warning' as const, icon: 'calendar-outline' as const }]
                      : []),
                  ]}
                  price={formatCurrency(item.price)}
                  selected={selectedIds.includes(item.id)}
                  onToggle={() => toggle(item.id)}
                />
              </FadeInView>
            );
          }}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <EmptyState
              icon="scan-outline"
              title="No scans found"
              description={`No ${tab === 'All' ? '' : `${tab} `}scan matches “${query.trim()}”.`}
              actionTitle="Clear filters"
              onActionPress={() => {
                setQuery('');
                setTab('All');
              }}
            />
          }
          ItemSeparatorComponent={RowGap}
          extraData={selectedIds}
          contentContainerStyle={[styles.listContent, { paddingBottom: barSpace + spacing.base }]}
          showsVerticalScrollIndicator={false}
          {...formScrollProps}
        />
        <OrderBar
          visible={!keyboardOpen}
          caption={selectedScans.length ? `${plural(selectedScans.length, 'scan')} selected` : 'Select scans to book'}
          total={total}
          cta={selectedScans.length > 1 ? `Book ${selectedScans.length} Scans` : 'Book Scan'}
          disabled={!selectedScans.length}
          onPress={openConfirm}
        />
      </KeyboardAwareContainer>

      <PatientPicker visible={picker} onClose={() => setPicker(false)} onSelect={(p) => setPatientId(p.id)} selectedId={patientId} title="Book scan for" />

      {/* Confirm & schedule */}
      <BottomSheet
        visible={sheetVisible}
        onClose={closeSheet}
        dismissible={!submitting}
        title={result ? undefined : 'Schedule Scan'}
        subtitle={result ? undefined : `${plural(selectedScans.length, 'scan')} • ${formatCurrency(total)}`}
        footer={footer}
        maxHeight={0.92}
      >
        {result ? (
          <OrderSuccessCard
            title={result.orders.length > 1 ? 'Scans Scheduled' : 'Scan Scheduled'}
            subtitle={`${result.patient.name} • ${formatDisplayDate(result.orders[0].date)}`}
            highlight={{ label: relativeDayLabel(result.orders[0].date), value: result.orders[0].time }}
          >
            {result.orders.map((o, i) => (
              <DetailRow key={o.id} icon="scan-outline" label={result.orders.length > 1 ? `Scan ${i + 1}` : 'Scan'} value={o.scanName} />
            ))}
            <DetailRow icon="person-outline" label="Ordered by" value={result.orders[0].orderedBy} />
            <DetailRow
              icon="wallet-outline"
              label="Payment"
              value={
                result.invoice.status === 'Pending'
                  ? `${formatCurrency(result.invoice.amount)} on IPD bill (Pending)`
                  : `${formatCurrency(result.invoice.amount)} paid • ${result.invoice.paymentMode}`
              }
              valueTone={result.invoice.status === 'Pending' ? 'warning' : 'success'}
              last
            />
            <LinkRow
              icon="receipt-outline"
              title={result.invoice.status === 'Pending' ? 'View pending bill' : 'View receipt'}
              subtitle={`${result.invoice.invoiceNo} • ${formatCurrency(result.invoice.amount)}`}
              onPress={() => goTo(() => router.push({ pathname: '/receipt/[id]', params: { id: result.invoice.id } }))}
            />
            <Text style={styles.arrive}>Report the patient to Radiology 15 minutes early. Remove metal objects before the scan.</Text>
          </OrderSuccessCard>
        ) : !selectedScans.length ? (
          <EmptyState icon="scan-outline" title="No scans selected" description="Pick one or more scans from the list." actionTitle="Back to scans" onActionPress={closeSheet} />
        ) : (
          <View>
            <Text style={styles.label}>Patient</Text>
            <PatientSelectorBar
              patient={patient}
              onPress={() => setSheetPicker(true)}
              label="Scan for"
              style={showErrors && !patient ? styles.errorBorder : undefined}
            />
            {showErrors && !patient && <Text style={styles.fieldError}>Select a patient — scans are never booked to an implicit patient.</Text>}
            <AllergyStrip patient={patient} />

            <Text style={styles.label}>Scans</Text>
            <View style={styles.lines}>
              {selectedScans.map((s) => (
                <View key={s.id} style={styles.line}>
                  <View style={styles.lineThumb}>
                    <MaterialCommunityIcons name={scanIcon(s)} size={16} color="#8FD3FF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lineName} numberOfLines={2}>
                      {s.name}
                    </Text>
                    <Text style={styles.lineMeta}>
                      {s.category} • {s.duration}
                    </Text>
                  </View>
                  <Text style={styles.linePrice}>{formatCurrency(s.price)}</Text>
                  <TouchableOpacity onPress={() => toggle(s.id)} hitSlop={12} style={styles.lineRemove} accessibilityRole="button" accessibilityLabel={`Remove ${s.name}`}>
                    <Ionicons name="close" size={15} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <AnimatedNumber value={total} duration={400} format={(n) => formatCurrency(n)} style={styles.totalValue} />
              </View>
            </View>

            {safetyItems.length > 0 && (
              <>
                <Text style={styles.label}>Safety checks</Text>
                <SafetyChecklist items={safetyItems} acked={acked} onToggle={(id) => setAcked((a) => ({ ...a, [id]: !a[id] }))} showErrors={showErrors} />
              </>
            )}

            <Text style={styles.label}>Schedule</Text>
            <ChoiceChips<string>
              options={days.map((iso, i) => ({
                value: iso,
                label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : weekdayShort(iso),
                sublabel: formatDayMonth(iso),
                icon: 'calendar-clear-outline',
              }))}
              value={day}
              onChange={(iso) => {
                setDay(iso);
                setTime(firstOpenSlot(iso));
              }}
              accessibilityLabel="Scan day"
            />
            <View style={styles.slots}>
              <SlotGrid slots={slots} selected={time} onSelect={setTime} />
            </View>
            {showErrors && !time && <Text style={styles.fieldError}>Pick an available time slot.</Text>}

            <Text style={styles.label}>Ordering doctor</Text>
            <ChoiceChips<string>
              scroll
              options={doctors.map((d) => ({ value: d.name, label: shortDoctorName(d.name), sublabel: d.department, icon: 'person-circle-outline' }))}
              value={orderedBy}
              onChange={setOrderedBy}
              accessibilityLabel="Ordering doctor"
            />

            <Text style={styles.label}>Payment</Text>
            <BillingOptions patient={patient} billing={billing} onBillingChange={setBilling} mode={mode} onModeChange={setMode} modes={modes} />

            <PatientPicker
              visible={sheetPicker}
              onClose={() => setSheetPicker(false)}
              onSelect={(p) => setPatientId(p.id)}
              selectedId={patientId}
              title="Book scan for"
              allowRegister={false}
            />
          </View>
        )}
      </BottomSheet>

      {/* Schedule list */}
      <BottomSheet
        visible={scheduleVisible}
        onClose={() => setScheduleVisible(false)}
        title="Scan schedule"
        subtitle={`${todayCount} today • ${plural(upcoming.length, 'open order')}`}
        maxHeight={0.85}
      >
        {!upcoming.length ? (
          <EmptyState icon="calendar-clear-outline" title="Nothing scheduled" description="Booked scans appear here with their slot and status." />
        ) : (
          upcoming.map((o, i) => {
            const showDay = i === 0 || upcoming[i - 1].date !== o.date;
            return (
              <View key={o.id}>
                {showDay && <Text style={styles.schedDay}>{relativeDayLabel(o.date)} • {formatDisplayDate(o.date)}</Text>}
                <PressableScale
                  onPress={() => goToPatient(o.patientId)}
                  style={styles.schedRow}
                  accessibilityRole="button"
                  accessibilityLabel={`${o.time}, ${o.patientName}, ${o.scanName}, ${o.status}`}
                >
                  <Text style={styles.schedTime}>{o.time}</Text>
                  <View style={styles.lineThumb}>
                    <MaterialCommunityIcons name={scanIcon({ name: o.scanName, category: o.category })} size={16} color="#8FD3FF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lineName} numberOfLines={1}>
                      {o.patientName}
                    </Text>
                    <Text style={styles.lineMeta} numberOfLines={1}>
                      {o.scanName}
                    </Text>
                  </View>
                  <Badge label={o.status} variant={statusVariant(o.status)} size="sm" />
                </PressableScale>
              </View>
            );
          })
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
  thumb: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: '#0B1B3A',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbGlow: {
    position: 'absolute',
    width: 60,
    height: 22,
    bottom: -12,
    borderRadius: 30,
    backgroundColor: 'rgba(143, 211, 255, 0.18)',
  },
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
  lines: { borderRadius: radius.lg, backgroundColor: colors.cardMuted, paddingHorizontal: spacing.md },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lineThumb: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#0B1B3A', alignItems: 'center', justifyContent: 'center' },
  lineName: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semiBold, color: colors.text },
  lineMeta: { fontSize: typography.fontSizes.xs, color: colors.textSecondary, marginTop: 2 },
  linePrice: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.bold, color: colors.text },
  lineRemove: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md },
  totalLabel: { fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.semiBold, color: colors.text },
  totalValue: { fontSize: typography.fontSizes.xl, fontWeight: typography.fontWeights.extraBold, color: colors.primary },
  slots: { marginTop: spacing.md },
  footerStack: { gap: spacing.sm },
  footerRow: { flexDirection: 'row', gap: spacing.sm },
  footerHalf: { flex: 1 },
  arrive: { fontSize: typography.fontSizes.xs + 1, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md, lineHeight: 17 },
  schedDay: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  schedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    minHeight: 56,
  },
  schedTime: { width: 62, fontSize: typography.fontSizes.xs + 1, fontWeight: typography.fontWeights.bold, color: colors.text },
});
