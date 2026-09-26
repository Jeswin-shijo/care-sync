import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
// expo-router 57 ships its own React Navigation build; hooks must come from it to see the screen's context.
import { usePreventRemove } from 'expo-router/react-navigation';
import type { Invoice, InvoiceItem } from '../data/mockData';
import type { PaymentMode } from '../logic/hospital';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { Button } from '../components/common/Button';
import { Badge, statusVariant } from '../components/common/Badge';
import { AnimatedNumber, FadeInView, PressableScale } from '../components/common/Motion';
import { BottomActionBar, useBottomBarSpace } from '../components/common/BottomActionBar';
import { KeyboardAwareContainer, formScrollProps } from '../components/common/KeyboardAware';
import { PatientPicker, PatientSelectorBar } from '../components/common/PatientPicker';
import { CatalogSheet } from '../components/finance/CatalogSheet';
import { PaymentModePicker } from '../components/finance/PaymentModePicker';
import { QtyStepper } from '../components/finance/QtyStepper';
import {
  CATALOG_ICON,
  DEFAULT_CATALOG_FOR_TYPE,
  NURSING_ITEM,
  REGISTRATION_ITEM,
  buildCatalog,
  type CatalogEntry,
  type CatalogKind,
} from '../components/finance/catalog';
import {
  DEFAULT_INVOICE_TITLE,
  INVOICE_TYPE_META,
  INVOICE_TYPE_ORDER,
  enabledPaymentModes,
  insurerName,
  isInsured,
  parseInvoiceType,
  signatoryFor,
} from '../components/finance/invoiceUtils';
import { findTemplate } from '../components/finance/templates';
import { formatCurrency, numberToWords } from '../utils/formatters';
import { daysFromToday } from '../utils/dates';

interface DraftLine {
  id: string;
  key?: string;
  kind: CatalogKind | 'custom';
  description: string;
  rate: number;
  rateText: string;
  qty: number;
  maxQty?: number;
  unit?: string;
  doctor?: { name: string; department: string };
  autoFocus?: boolean;
}

type SectionKey = 'patient' | 'items' | 'adjustments' | 'payment';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** '' → 0, "1,200" → 1200, junk → NaN */
const parseAmount = (text: string) => {
  const t = text.replace(/[₹,\s]/g, '');
  if (!t) return 0;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};

const BILLING_ONLY_NOTE: Partial<Record<Invoice['type'], { text: string; label: string; route: '/lab' | '/radiology' | '/pharmacy' }>> = {
  Lab: { text: 'This raises the bill only. To also send the sample request to the lab, order from Lab / Pathology.', label: 'Open Lab / Pathology', route: '/lab' },
  Radiology: { text: 'This raises the bill only. To also book the scan slot, order from Radiology.', label: 'Open Radiology', route: '/radiology' },
  Pharmacy: { text: 'Billing here does not deduct stock. Dispense from the Pharmacy counter to update inventory.', label: 'Open Pharmacy', route: '/pharmacy' },
};

export default function CreateInvoiceRoute() {
  const params = useLocalSearchParams<{ patientId?: string; type?: string; template?: string }>();
  const { doctors, labTests, radiologyScans, medicines, wardInfo, settings, getPatient, createInvoice } = useApp();
  const { showToast } = useToast();
  const navigation = useNavigation();
  const bottomSpace = useBottomBarSpace(84);
  const { width: windowWidth } = useWindowDimensions();
  // Four type tiles per row, flush with the 16pt gutters.
  const typeTileWidth = Math.floor((windowWidth - spacing.base * 2 - spacing.sm * 3) / 4);
  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef<Partial<Record<SectionKey, number>>>({});
  const lineSeq = useRef(0);

  const template = findTemplate(params.template);
  const initialType = parseInvoiceType(params.type) ?? template?.invoiceType ?? 'OPD';
  const titleFor = (t: Invoice['type']) => (template?.createTitle && template.invoiceType === t ? template.createTitle : DEFAULT_INVOICE_TITLE[t]);
  const paramPatient = params.patientId ? getPatient(params.patientId) : undefined;

  const [patientId, setPatientId] = useState<string | null>(paramPatient?.id ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [type, setType] = useState<Invoice['type']>(initialType);
  const [title, setTitle] = useState(() => titleFor(initialType));
  const [titleEdited, setTitleEdited] = useState(false);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [discountMode, setDiscountMode] = useState<'amount' | 'percent'>('amount');
  const [discountText, setDiscountText] = useState('');
  const [insuranceText, setInsuranceText] = useState('');
  const modes = enabledPaymentModes(settings.paymentModes);
  const [collectNow, setCollectNow] = useState(modes.length > 0);
  const [mode, setMode] = useState<PaymentMode | null>(modes[0] ?? null);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const patient = patientId ? getPatient(patientId) : undefined;
  const catalog = useMemo(
    () => buildCatalog({ doctors, labTests, radiologyScans, medicines, wardInfo }),
    [doctors, labTests, radiologyScans, medicines, wardInfo]
  );

  // ---------------------------------------------------------------- lines
  const nextId = () => `line-${++lineSeq.current}`;

  const addEntry = (entry: CatalogEntry, qty = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.key === entry.key);
      if (existing) {
        const next = existing.qty + qty;
        return prev.map((l) => (l.key === entry.key ? { ...l, qty: l.maxQty ? Math.min(next, l.maxQty) : next } : l));
      }
      return [
        ...prev,
        {
          id: nextId(),
          key: entry.key,
          kind: entry.kind,
          description: entry.name,
          rate: entry.rate,
          rateText: String(entry.rate),
          qty: entry.maxQty ? Math.min(qty, entry.maxQty) : qty,
          maxQty: entry.maxQty,
          unit: entry.unit,
          doctor: entry.doctor,
        },
      ];
    });
  };

  const addCustom = () => {
    setLines((prev) => [...prev, { id: nextId(), kind: 'custom', description: '', rate: 0, rateText: '', qty: 1, autoFocus: true }]);
  };

  const updateLine = (id: string, patch: Partial<DraftLine>) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const removeLine = (id: string) => setLines((prev) => prev.filter((l) => l.id !== id));

  const addedQty = useMemo(() => {
    const map: Record<string, number> = {};
    lines.forEach((l) => {
      if (l.key) map[l.key] = l.qty;
    });
    return map;
  }, [lines]);

  // Quick-add suggestions from the patient's context.
  const suggestions = useMemo(() => {
    const out: Array<{ key: string; label: string; entry: CatalogEntry; qty: number }> = [];
    const has = (key: string) => lines.some((l) => l.key === key);
    if (type === 'REG') {
      const reg = catalog.registration.find((e) => e.name === REGISTRATION_ITEM.name);
      if (reg && !has(reg.key)) out.push({ key: reg.key, label: `Registration & UHID card • ${formatCurrency(reg.rate)}`, entry: reg, qty: 1 });
    }
    if (type === 'OPD' && patient?.attendingDoctor) {
      const consult = catalog.consultation.find((e) => e.doctor?.name === patient.attendingDoctor);
      if (consult && !has(consult.key)) {
        out.push({ key: consult.key, label: `Consultation — ${patient.attendingDoctor} • ${formatCurrency(consult.rate)}`, entry: consult, qty: 1 });
      }
    }
    if ((type === 'IPD' || type === 'Surgery') && patient?.status === 'Admitted' && patient.wardId) {
      const room = catalog.room.find((e) => e.key === `ward-${patient.wardId}`);
      const nursing = catalog.room.find((e) => e.name === NURSING_ITEM.name);
      const advance = template?.kind === 'admission';
      const days = advance ? 1 : Math.max(1, -daysFromToday(patient.admittedOn ?? '') || 1);
      if (room && !has(room.key)) {
        out.push({ key: room.key, label: `${advance ? 'Room advance' : 'Room charges'} × ${days} day${days > 1 ? 's' : ''} • ${formatCurrency(room.rate * days)}`, entry: room, qty: days });
      }
      if (nursing && !has(nursing.key)) {
        out.push({ key: nursing.key, label: `Nursing care × ${days} day${days > 1 ? 's' : ''} • ${formatCurrency(nursing.rate * days)}`, entry: nursing, qty: days });
      }
    }
    return out;
  }, [type, patient, catalog, lines, template]);

  // ---------------------------------------------------------------- amounts
  const gross = round2(lines.reduce((n, l) => n + (Number.isFinite(l.rate) ? l.rate : 0) * l.qty, 0));
  const discountInput = parseAmount(discountText);
  const discount = Number.isNaN(discountInput) ? 0 : round2(discountMode === 'percent' ? (gross * discountInput) / 100 : discountInput);
  const insuranceAllowed = (type === 'IPD' || type === 'Surgery') && isInsured(patient);
  const insuranceInput = insuranceAllowed ? parseAmount(insuranceText) : 0;
  const insurance = Number.isNaN(insuranceInput) ? 0 : round2(insuranceInput);
  const net = round2(gross - discount - insurance);

  const consultLine = lines.find((l) => l.doctor);
  const doctorName = consultLine?.doctor
    ? `${consultLine.doctor.name} (${consultLine.doctor.department})`
    : (type === 'IPD' || type === 'Surgery') && patient?.attendingDoctor
      ? `${patient.attendingDoctor} (${patient.department ?? 'General Medicine'})`
      : undefined;
  const signatory = signatoryFor({ doctorName }, doctors);

  // ---------------------------------------------------------------- validation
  const lineErrors: Record<string, string> = {};
  lines.forEach((l) => {
    if (l.kind === 'custom' && !l.description.trim()) lineErrors[l.id] = 'Describe this item.';
    else if (l.kind === 'custom' && (!Number.isFinite(l.rate) || l.rate <= 0)) lineErrors[l.id] = 'Enter a rate above ₹0.';
    else if (typeof l.maxQty === 'number' && l.qty > l.maxQty) lineErrors[l.id] = `Only ${l.maxQty} in stock.`;
  });
  const errors: Partial<Record<'patient' | 'items' | 'discount' | 'insurance' | 'net' | 'payment', string>> = {};
  if (!patient) errors.patient = params.patientId && !paramPatient ? 'That patient record was not found — select the patient to bill.' : 'Select the patient to bill.';
  if (!lines.length) errors.items = 'Add at least one item.';
  if (Number.isNaN(discountInput) || discountInput < 0) errors.discount = 'Enter a valid discount.';
  else if (discountMode === 'percent' && discountInput > 100) errors.discount = "Discount can't exceed 100%.";
  else if (discount > gross) errors.discount = "Discount can't exceed the bill total.";
  if (insuranceAllowed && (Number.isNaN(insuranceInput) || insuranceInput < 0)) errors.insurance = 'Enter a valid approved amount.';
  else if (insurance > round2(gross - discount)) errors.insurance = "Insurance approval can't exceed the bill after discount.";
  if (lines.length && !errors.discount && !errors.insurance && net <= 0) errors.net = 'Net payable must be more than ₹0.';
  if (collectNow && !mode) errors.payment = 'Choose how the patient is paying.';
  const errorCount = Object.keys(errors).length + Object.keys(lineErrors).length;
  const visibleError = (k: keyof typeof errors) => (showErrors ? errors[k] : undefined);

  // ---------------------------------------------------------------- leaving
  const dirty = lines.length > 0 || !!discountText.trim() || !!insuranceText.trim() || titleEdited;
  usePreventRemove(dirty && !createdId, ({ data }) => {
    Alert.alert('Discard Invoice?', 'The items and amounts you entered will be lost.', [
      { text: 'Keep Editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  useEffect(() => {
    if (createdId) router.replace({ pathname: '/receipt/[id]', params: { id: createdId } });
  }, [createdId]);

  const selectType = (t: Invoice['type']) => {
    setType(t);
    if (!titleEdited) setTitle(titleFor(t));
  };

  const scrollToFirstError = () => {
    const order: SectionKey[] = ['patient', 'items', 'adjustments', 'payment'];
    const failing = order.find((k) =>
      k === 'patient'
        ? !!errors.patient
        : k === 'items'
          ? !!errors.items || Object.keys(lineErrors).length > 0
          : k === 'adjustments'
            ? !!errors.discount || !!errors.insurance || !!errors.net
            : !!errors.payment
    );
    const y = failing ? sectionY.current[failing] : undefined;
    if (typeof y === 'number') scrollRef.current?.scrollTo({ y: Math.max(0, y - spacing.md), animated: true });
  };

  const submit = () => {
    if (submitting || createdId) return;
    if (errorCount > 0 || !patient) {
      setShowErrors(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      scrollToFirstError();
      return;
    }
    setSubmitting(true);
    const items: InvoiceItem[] = lines.map((l) => ({
      description: l.description.trim(),
      qty: l.qty,
      rate: l.rate,
      amount: round2(l.rate * l.qty),
    }));
    if (discount > 0) {
      const label = discountMode === 'percent' ? `Discount (${discountInput}%)` : 'Discount';
      items.push({ description: label, qty: 1, rate: -discount, amount: -discount });
    }
    if (insurance > 0) {
      items.push({ description: `Less: Insurance approved (${insurerName(patient.insurance)})`, qty: 1, rate: -insurance, amount: -insurance });
    }
    const status: Invoice['status'] = collectNow ? 'Paid' : 'Pending';
    const invoice = createInvoice({
      type,
      patientId: patient.id,
      title: title.trim() || titleFor(type),
      items,
      amount: net,
      paymentMode: mode ?? modes[0] ?? 'Cash',
      status,
      doctorName,
      insuranceCovered: insurance > 0 ? insurance : undefined,
    });
    showToast({
      type: 'success',
      title: status === 'Paid' ? 'Payment collected' : 'Bill saved as pending',
      message: `${invoice.invoiceNo} • ${formatCurrency(invoice.amount)} • ${patient.name}`,
    });
    setCreatedId(invoice.id);
  };

  const note = BILLING_ONLY_NOTE[type];
  const trackY = (key: SectionKey) => (e: { nativeEvent: { layout: { y: number } } }) => {
    sectionY.current[key] = e.nativeEvent.layout.y;
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header title="Generate Receipt" subtitle={template ? `Using template: ${template.title}` : 'Create an invoice or bill'} showBack />

      <KeyboardAwareContainer>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.content, { paddingBottom: bottomSpace + spacing.base }]}
          showsVerticalScrollIndicator={false}
          {...formScrollProps}
        >
          {/* Patient */}
          <View onLayout={trackY('patient')}>
            <FadeInView>
              <View>
                <Text style={styles.label}>Billing to</Text>
                <PatientSelectorBar patient={patient} onPress={() => setPickerOpen(true)} label="Patient" style={visibleError('patient') ? styles.fieldError : undefined} />
                {!!visibleError('patient') && <Text style={styles.errorText}>{visibleError('patient')}</Text>}
                {!!patient && (
                  <View style={styles.patientMeta}>
                    <Badge label={patient.status} variant={statusVariant(patient.status)} size="sm" />
                    <Text style={styles.patientMetaText} numberOfLines={1}>
                      {patient.age}y {patient.gender[0]} • {insurerName(patient.insurance)}
                      {patient.room ? ` • ${patient.room}` : ''}
                    </Text>
                  </View>
                )}
              </View>
            </FadeInView>
          </View>

          {/* Type */}
          <FadeInView delay={60}>
            <Text style={styles.label}>Invoice type</Text>
            <View style={styles.typeGrid} accessibilityRole="radiogroup">
              {INVOICE_TYPE_ORDER.map((t) => {
                const m = INVOICE_TYPE_META[t];
                const selected = t === type;
                return (
                  <PressableScale
                    key={t}
                    onPress={() => selectType(t)}
                    style={[styles.typeTile, { width: typeTileWidth }, selected && { borderColor: m.color, backgroundColor: m.bg }]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${m.label} invoice`}
                  >
                    <Ionicons name={m.icon} size={18} color={m.color} />
                    <Text style={[styles.typeLabel, selected && styles.typeLabelActive]} numberOfLines={1} adjustsFontSizeToFit>
                      {m.label}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
            <Text style={styles.label}>Bill title</Text>
            <TextInput
              value={title}
              onChangeText={(t) => {
                setTitle(t);
                setTitleEdited(true);
              }}
              placeholder={titleFor(type)}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              maxLength={60}
              returnKeyType="done"
            />
          </FadeInView>

          {/* Items */}
          <View onLayout={trackY('items')}>
            <FadeInView delay={120}>
              <View>
                <View style={styles.sectionRow}>
                  <Text style={[styles.label, { marginTop: 0 }]}>Items</Text>
                  {lines.length > 0 && (
                    <TouchableOpacity onPress={() => setCatalogOpen(true)} hitSlop={10} accessibilityRole="button">
                      <Text style={styles.link}>+ Add item</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {suggestions.length > 0 && (
                  <View style={styles.suggestions}>
                    {suggestions.map((s) => (
                      <PressableScale key={s.key} style={styles.suggestion} onPress={() => addEntry(s.entry, s.qty)} accessibilityRole="button" accessibilityLabel={`Add ${s.label}`}>
                        <Ionicons name="flash-outline" size={14} color={colors.primary} />
                        <Text style={styles.suggestionText} numberOfLines={1}>
                          {s.label}
                        </Text>
                      </PressableScale>
                    ))}
                  </View>
                )}

                {lines.length === 0 ? (
                  <View style={[styles.emptyItems, visibleError('items') && styles.fieldError]}>
                    <Ionicons name="cart-outline" size={26} color={colors.primary} />
                    <Text style={styles.emptyTitle}>No items yet</Text>
                    <Text style={styles.emptyText}>Add consultations, tests, scans, medicines, room charges or procedures.</Text>
                    <View style={styles.emptyActions}>
                      <Button title="Browse catalogue" onPress={() => setCatalogOpen(true)} size="sm" icon={<Ionicons name="list-outline" size={16} color="#FFFFFF" />} />
                      <Button title="Custom line" onPress={addCustom} size="sm" variant="outline" />
                    </View>
                  </View>
                ) : (
                  lines.map((l) => {
                    const err = showErrors ? lineErrors[l.id] : undefined;
                    return (
                      <FadeInView key={l.id} offset={8}>
                        <View style={[styles.lineCard, err && styles.fieldError]}>
                          <View style={styles.lineTop}>
                            <View style={styles.lineIcon}>
                              <Ionicons name={CATALOG_ICON[l.kind]} size={16} color={colors.primary} />
                            </View>
                            <View style={styles.lineBody}>
                              {l.kind === 'custom' ? (
                                <TextInput
                                  value={l.description}
                                  onChangeText={(t) => updateLine(l.id, { description: t })}
                                  placeholder="Item description (e.g. Physiotherapy session)"
                                  placeholderTextColor={colors.textMuted}
                                  style={styles.lineInput}
                                  autoFocus={l.autoFocus}
                                  maxLength={80}
                                />
                              ) : (
                                <Text style={styles.lineName}>{l.description}</Text>
                              )}
                              {l.kind !== 'custom' && (
                                <Text style={styles.lineMeta} numberOfLines={1}>
                                  {formatCurrency(l.rate)}
                                  {l.unit ? ` ${l.unit}` : ''}
                                  {typeof l.maxQty === 'number' ? ` • ${l.maxQty} in stock` : ''}
                                </Text>
                              )}
                            </View>
                            <TouchableOpacity
                              onPress={() => removeLine(l.id)}
                              style={styles.removeBtn}
                              hitSlop={6}
                              accessibilityRole="button"
                              accessibilityLabel={`Remove ${l.description || 'item'}`}
                            >
                              <Ionicons name="trash-outline" size={18} color={colors.danger} />
                            </TouchableOpacity>
                          </View>
                          <View style={styles.lineBottom}>
                            <QtyStepper value={l.qty} onChange={(q) => updateLine(l.id, { qty: q })} max={l.maxQty} label={`${l.description || 'item'} quantity`} />
                            {l.kind === 'custom' ? (
                              <View style={styles.rateBox}>
                                <Text style={styles.rupee}>₹</Text>
                                <TextInput
                                  value={l.rateText}
                                  onChangeText={(t) => {
                                    const n = parseAmount(t);
                                    updateLine(l.id, { rateText: t, rate: Number.isNaN(n) ? NaN : n });
                                  }}
                                  placeholder="Rate"
                                  placeholderTextColor={colors.textMuted}
                                  keyboardType="decimal-pad"
                                  style={styles.rateInput}
                                  accessibilityLabel="Rate"
                                  maxLength={9}
                                />
                              </View>
                            ) : (
                              <Text style={styles.times}>× {formatCurrency(l.rate)}</Text>
                            )}
                            <Text style={styles.lineAmount} numberOfLines={1}>
                              {formatCurrency(Number.isFinite(l.rate) ? round2(l.rate * l.qty) : 0)}
                            </Text>
                          </View>
                          {!!err && <Text style={styles.errorText}>{err}</Text>}
                        </View>
                      </FadeInView>
                    );
                  })
                )}
                {!!visibleError('items') && <Text style={styles.errorText}>{visibleError('items')}</Text>}
                {lines.length > 0 && (
                  <View style={styles.addRow}>
                    <TouchableOpacity style={styles.addBtn} onPress={() => setCatalogOpen(true)} accessibilityRole="button">
                      <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                      <Text style={styles.addBtnText}>From catalogue</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addBtn} onPress={addCustom} accessibilityRole="button">
                      <Ionicons name="create-outline" size={18} color={colors.primary} />
                      <Text style={styles.addBtnText}>Custom line</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {!!note && (
                  <View style={styles.note}>
                    <Ionicons name="information-circle-outline" size={18} color={colors.infoText} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.noteText}>{note.text}</Text>
                      <TouchableOpacity
                        onPress={() => router.push(patient ? { pathname: note.route, params: { patientId: patient.id } } : note.route)}
                        hitSlop={8}
                        accessibilityRole="link"
                      >
                        <Text style={styles.noteLink}>{note.label} ›</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </FadeInView>
          </View>

          {/* Discount & insurance */}
          <View onLayout={trackY('adjustments')}>
            <FadeInView delay={180}>
              <View>
                <Text style={styles.label}>Discount</Text>
                <View style={styles.discountRow}>
                  <View style={styles.segment}>
                    {(['amount', 'percent'] as const).map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.segmentBtn, discountMode === m && styles.segmentActive]}
                        onPress={() => setDiscountMode(m)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: discountMode === m }}
                        accessibilityLabel={m === 'amount' ? 'Discount in rupees' : 'Discount in percent'}
                      >
                        <Text style={[styles.segmentText, discountMode === m && styles.segmentTextActive]}>{m === 'amount' ? '₹' : '%'}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    value={discountText}
                    onChangeText={setDiscountText}
                    placeholder={discountMode === 'amount' ? 'Amount (optional)' : 'Percent (optional)'}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    style={[styles.input, styles.flexInput, visibleError('discount') && styles.fieldError]}
                    maxLength={9}
                  />
                </View>
                {!!visibleError('discount') && <Text style={styles.errorText}>{visibleError('discount')}</Text>}

                {insuranceAllowed && patient && (
                  <>
                    <Text style={styles.label}>Insurance approved (₹)</Text>
                    <TextInput
                      value={insuranceText}
                      onChangeText={setInsuranceText}
                      placeholder={`Pre-authorised by ${insurerName(patient.insurance)} (optional)`}
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                      style={[styles.input, visibleError('insurance') && styles.fieldError]}
                      maxLength={9}
                    />
                    {!!visibleError('insurance') && <Text style={styles.errorText}>{visibleError('insurance')}</Text>}
                  </>
                )}
              </View>
            </FadeInView>
          </View>

          {/* Summary */}
          <FadeInView delay={220}>
            <View style={styles.summary}>
              <View style={styles.sumRow}>
                <Text style={styles.sumLabel}>Gross charges</Text>
                <Text style={styles.sumValue}>{formatCurrency(gross)}</Text>
              </View>
              {discount > 0 && (
                <View style={styles.sumRow}>
                  <Text style={styles.sumLabel}>Discount{discountMode === 'percent' && !Number.isNaN(discountInput) ? ` (${discountInput}%)` : ''}</Text>
                  <Text style={styles.sumValue}>− {formatCurrency(discount)}</Text>
                </View>
              )}
              {insurance > 0 && (
                <View style={styles.sumRow}>
                  <Text style={[styles.sumLabel, { color: colors.success }]}>Insurance approved</Text>
                  <Text style={[styles.sumValue, { color: colors.success }]}>− {formatCurrency(insurance)}</Text>
                </View>
              )}
              <View style={styles.netRow}>
                <Text style={styles.netLabel}>Net payable</Text>
                <AnimatedNumber value={Math.max(0, net)} duration={450} format={(n) => formatCurrency(Math.round(n * 100) / 100, { decimals: 2 })} style={styles.netValue} />
              </View>
              <Text style={styles.words}>{numberToWords(Math.max(0, net))}</Text>
              {!!visibleError('net') && <Text style={styles.errorText}>{visibleError('net')}</Text>}
              <Text style={styles.signedBy}>
                Signed by {signatory}
                {doctorName ? '' : ' (no consultant on this bill)'}
              </Text>
            </View>
          </FadeInView>

          {/* Payment */}
          <View onLayout={trackY('payment')}>
            <FadeInView delay={260}>
              <View>
                <Text style={styles.label}>Payment</Text>
                <View style={styles.payToggle}>
                  <TouchableOpacity
                    style={[styles.payOption, collectNow && styles.payOptionActive, !modes.length && styles.payOptionDisabled]}
                    onPress={() => modes.length && setCollectNow(true)}
                    disabled={!modes.length}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: collectNow, disabled: !modes.length }}
                  >
                    <Ionicons name="wallet-outline" size={18} color={collectNow ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.payText, collectNow && styles.payTextActive]}>Collect now</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.payOption, !collectNow && styles.payOptionActive]}
                    onPress={() => setCollectNow(false)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: !collectNow }}
                  >
                    <Ionicons name="time-outline" size={18} color={!collectNow ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.payText, !collectNow && styles.payTextActive]}>Save as pending</Text>
                  </TouchableOpacity>
                </View>
                {collectNow ? (
                  <PaymentModePicker modes={modes} value={mode} onChange={setMode} style={{ marginTop: spacing.md }} />
                ) : (
                  <Text style={styles.hint}>The bill is raised as pending and appears under Billing → Pending until collected.</Text>
                )}
                {!modes.length && (
                  <TouchableOpacity onPress={() => router.push({ pathname: '/settings/[section]', params: { section: 'billing' } })} hitSlop={8}>
                    <Text style={styles.noteLink}>No payment modes are enabled — open Settings → Billing ›</Text>
                  </TouchableOpacity>
                )}
                {!!visibleError('payment') && <Text style={styles.errorText}>{visibleError('payment')}</Text>}
              </View>
            </FadeInView>
          </View>
        </ScrollView>

        <BottomActionBar>
          <View style={styles.barRow}>
            <View style={styles.barTotal}>
              <Text style={styles.barLabel}>{showErrors && errorCount ? `${errorCount} issue${errorCount === 1 ? '' : 's'} to fix` : 'Net payable'}</Text>
              <AnimatedNumber
                value={Math.max(0, net)}
                duration={450}
                format={(n) => formatCurrency(Math.round(n))}
                style={[styles.barAmount, showErrors && errorCount > 0 && { color: colors.danger }]}
              />
            </View>
            <Button
              title={collectNow ? `Collect ${formatCurrency(Math.max(0, net))}` : 'Save Pending Bill'}
              onPress={submit}
              loading={submitting}
              disabled={submitting || !!createdId}
              style={styles.barButton}
              icon={<Ionicons name={collectNow ? 'checkmark-circle-outline' : 'save-outline'} size={18} color="#FFFFFF" />}
            />
          </View>
        </BottomActionBar>
      </KeyboardAwareContainer>

      <PatientPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(p) => setPatientId(p.id)}
        selectedId={patientId}
        title="Bill which patient?"
      />

      <CatalogSheet
        visible={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        catalog={catalog}
        initialTab={DEFAULT_CATALOG_FOR_TYPE[type]}
        addedQty={addedQty}
        onAdd={(e) => addEntry(e)}
        onAddCustom={() => {
          setCatalogOpen(false);
          setTimeout(addCustom, 260);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.base,
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
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  link: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  fieldError: {
    borderColor: colors.danger,
    borderWidth: 1.5,
  },
  errorText: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.danger,
    marginTop: 6,
    fontWeight: typography.fontWeights.medium,
  },
  patientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  patientMetaText: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeTile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 62,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  typeLabel: {
    fontSize: 11.5,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
  },
  typeLabelActive: {
    color: colors.text,
    fontWeight: typography.fontWeights.bold,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    fontSize: typography.fontSizes.md,
    color: colors.text,
  },
  flexInput: {
    flex: 1,
  },
  suggestions: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  suggestionText: {
    flexShrink: 1,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.primary,
  },
  emptyItems: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    padding: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  emptyText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  lineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  lineTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  lineIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineBody: {
    flex: 1,
  },
  lineName: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  lineMeta: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  lineInput: {
    fontSize: typography.fontSizes.sm + 1,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 6,
    minHeight: 40,
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerLight,
  },
  lineBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  rateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    minHeight: 40,
    width: 104,
  },
  rupee: {
    fontSize: typography.fontSizes.md,
    color: colors.textSecondary,
    marginRight: 2,
  },
  rateInput: {
    flex: 1,
    fontSize: typography.fontSizes.md,
    color: colors.text,
    paddingVertical: 4,
  },
  times: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  lineAmount: {
    flex: 1,
    textAlign: 'right',
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  addRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary + '88',
    backgroundColor: '#FFFFFF',
  },
  addBtnText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.primary,
  },
  note: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.infoLight,
  },
  noteText: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.infoText,
    lineHeight: 17,
  },
  noteLink: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
    marginTop: 6,
  },
  discountRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  segmentBtn: {
    width: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  summary: {
    marginTop: spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary + '22',
    padding: spacing.base,
    ...shadows.sm,
  },
  sumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  sumLabel: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  sumValue: {
    fontSize: typography.fontSizes.sm,
    color: colors.text,
    fontWeight: typography.fontWeights.semiBold,
  },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  netLabel: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  netValue: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.primary,
  },
  words: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  signedBy: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  payToggle: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  payOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  payOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  payOptionDisabled: {
    opacity: 0.45,
  },
  payText: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
  },
  payTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  hint: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: 17,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  barTotal: {
    flexShrink: 1,
  },
  barLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.semiBold,
  },
  barAmount: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.text,
  },
  barButton: {
    flex: 1,
    minHeight: 50,
  },
});
