import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import type { Medicine, PrescriptionReviewItem } from '../data/mockData';
import { LOW_STOCK_THRESHOLD } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import type { DispenseResult } from '../logic/hospital';
import { ROLE_ACTOR } from '../logic/hospital';
import type { SafetyAlert } from '../logic/safety';
import { formatCurrency } from '../utils/formatters';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { Badge, statusVariant } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { FadeInView, PressableScale, stagger } from '../components/common/Motion';
import { CheckPop } from '../components/portals/AnimatedCheckbox';
import { CardAction } from '../components/portals/CardAction';
import { ClarificationSheet } from '../components/portals/ClarificationSheet';
import { CountTabs } from '../components/portals/CountTabs';
import { ExitCollapse } from '../components/portals/ExitCollapse';
import { OverrideSheet } from '../components/portals/OverrideSheet';
import { SafetyEngineSheet } from '../components/portals/SafetyEngineSheet';
import { computeSafetyChecks, overrideNote, SafetyChecksRow } from '../components/portals/SafetyChecksRow';
import { durationLabel } from '../components/portals/useNow';

type Tab = 'pending' | 'hold' | 'dispensed';
type Dispensed = Extract<DispenseResult, { ok: true }>;

const tabOf = (r: PrescriptionReviewItem): Tab =>
  r.status === 'Dispensed' ? 'dispensed' : r.status === 'Doctor Clarification' ? 'hold' : 'pending';
const drugName = (d: string) => d.split('(')[0].trim();
const EXIT_UI: Record<Tab, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  dispensed: { label: 'Dispensed', icon: 'checkmark-circle', color: colors.success },
  hold: { label: 'On hold — doctor notified', icon: 'pause-circle', color: colors.warning },
  pending: { label: 'Back to review', icon: 'refresh-circle', color: colors.primary },
};

export default function PharmacyReviewRoute() {
  const {
    setActiveRole,
    prescriptionReviews,
    dispensePrescription,
    requestClarification,
    applySaferAlternative,
    checkDrugsForPatient,
    notifications,
    medicines,
    labSamples,
    clinicalProfiles,
  } = useApp();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('pending');
  const [exiting, setExiting] = useState<Record<string, { from: Tab; to: Tab }>>({});
  const [override, setOverride] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [clarify, setClarify] = useState<{ open: boolean; id: string | null; note?: string }>({ open: false, id: null });
  const [engineOpen, setEngineOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Re-asserted on every focus, so returning to this portal restores its role.
  useFocusEffect(
    useCallback(() => {
      setActiveRole('pharmacy');
    }, [setActiveRole])
  );

  // Live re-screen by the rules engine (allergies, interactions, eGFR / ALT from the latest labs).
  const engine = useMemo(() => {
    const map: Record<string, SafetyAlert[]> = {};
    prescriptionReviews.forEach((rx) => {
      map[rx.id] = rx.patientId ? checkDrugsForPatient(rx.patientId, rx.drugs) : [];
    });
    return map;
  }, [prescriptionReviews, labSamples, clinicalProfiles, checkDrugsForPatient]);

  const sorted = useMemo(
    () => [...prescriptionReviews].sort((a, b) => (a.prescriptionCode < b.prescriptionCode ? 1 : -1)),
    [prescriptionReviews]
  );
  const counts = {
    pending: sorted.filter((r) => tabOf(r) === 'pending').length,
    hold: sorted.filter((r) => tabOf(r) === 'hold').length,
    dispensed: sorted.filter((r) => tabOf(r) === 'dispensed').length,
  };
  const flaggedPending = sorted.filter((r) => tabOf(r) === 'pending' && r.safetyStatus !== 'Safe').length;
  const visible = sorted.filter((r) => tabOf(r) === tab || exiting[r.id]?.from === tab);
  const overrideRx = prescriptionReviews.find((r) => r.id === override.id) ?? null;
  const clarifyRx = prescriptionReviews.find((r) => r.id === clarify.id) ?? null;

  const changeTab = (t: Tab) => {
    setExiting({});
    setTab(t);
  };
  const markExit = (id: string, to: Tab) => {
    if (to !== tab) setExiting((e) => ({ ...e, [id]: { from: tab, to } }));
  };
  const clearExit = (id: string) =>
    setExiting((e) => {
      const next = { ...e };
      delete next[id];
      return next;
    });

  const holdNoteFor = (rx: PrescriptionReviewItem) => {
    const n = notifications.find((x) => x.title === `Clarification requested: ${rx.prescriptionCode}`);
    if (!n) return null;
    const i = n.description.indexOf(' • ');
    const mins = n.createdAt ? Math.max(0, Math.round((Date.now() - n.createdAt) / 60000)) : null;
    return { note: i >= 0 ? n.description.slice(i + 3) : n.description, when: mins === null ? n.timestamp : mins < 1 ? 'just now' : `${durationLabel(mins)} ago` };
  };

  const openClarify = (rx: PrescriptionReviewItem, note?: string) => setClarify({ open: true, id: rx.id, note });

  const finishDispense = (rx: PrescriptionReviewItem, res: Dispensed, overridden: boolean) => {
    markExit(rx.id, 'dispensed');
    const inv = res.invoice;
    const invoiceAction = inv ? { label: 'Invoice', onPress: () => router.push({ pathname: '/receipt/[id]', params: { id: inv.id } }) } : undefined;
    if (res.unavailable.length) {
      showToast({
        type: 'info',
        title: `Dispensed — ${res.unavailable.length} item${res.unavailable.length > 1 ? 's' : ''} not stocked`,
        message: `${res.unavailable.join(', ')}: not stocked here — advise the patient to buy outside.${inv ? ` Billed ${inv.invoiceNo} • ${formatCurrency(inv.amount)}.` : ''}`,
        action: invoiceAction,
        duration: 5500,
      });
      return;
    }
    showToast({
      type: overridden ? 'warning' : 'success',
      title: overridden ? 'Dispensed with override' : 'Prescription dispensed',
      message: `${rx.prescriptionCode} • ${rx.patientName}${inv ? ` • ${inv.invoiceNo} ${formatCurrency(inv.amount)}` : ''}${overridden ? ' • reason recorded in audit log' : ''}`,
      action: invoiceAction,
      duration: 4500,
    });
  };

  const dispense = (rx: PrescriptionReviewItem) => {
    const res = dispensePrescription(rx.id);
    if (res.ok) {
      finishDispense(rx, res, false);
      return;
    }
    switch (res.error) {
      case 'OUT_OF_STOCK': {
        const short = res.shortages ?? [];
        Alert.alert('Out of Stock', `${rx.prescriptionCode} can't be dispensed — not enough stock for:\n• ${short.join('\n• ')}\n\nRaise an indent, or ask the prescriber for a substitute.`, [
          { text: 'Close', style: 'cancel' },
          {
            text: 'Ask doctor',
            // Let the alert's modal finish closing before the sheet's modal opens (iOS presents one at a time).
            onPress: () => setTimeout(() => openClarify(rx, `Out of stock: ${short.join(', ')}. Please prescribe a substitute.`), 300),
          },
        ]);
        return;
      }
      case 'NEEDS_OVERRIDE':
        setOverride({ open: true, id: rx.id });
        return;
      case 'ALREADY_DISPENSED':
        showToast({ type: 'info', message: `${rx.prescriptionCode} was already dispensed.` });
        return;
      default:
        showToast({ type: 'danger', title: 'Prescription not found', message: 'It is no longer in the review queue.' });
    }
  };

  const submitOverride = (reason: string): DispenseResult => {
    const rx = overrideRx;
    if (!rx) return { ok: false, error: 'NOT_FOUND' };
    const res = dispensePrescription(rx.id, { override: { reason, by: ROLE_ACTOR.pharmacy } });
    if (res.ok) {
      setOverride((o) => ({ ...o, open: false }));
      finishDispense(rx, res, true);
    }
    return res;
  };

  const submitClarify = (note: string) => {
    const rx = clarifyRx;
    setClarify((c) => ({ ...c, open: false }));
    if (!rx) return;
    const updated = requestClarification(rx.id, note);
    if (!updated) {
      showToast({ type: 'danger', message: 'Prescription not found.' });
      return;
    }
    markExit(rx.id, 'hold');
    showToast({
      type: 'success',
      title: `Sent to ${rx.doctorName}`,
      message: `${rx.prescriptionCode} is on hold until the doctor responds.`,
      action: tab !== 'hold' ? { label: 'On hold', onPress: () => changeTab('hold') } : undefined,
    });
  };

  const applyAlternative = (rx: PrescriptionReviewItem) => {
    Alert.alert(
      'Confirm substitution',
      `Apply only if ${rx.doctorName} has approved the change.\n\n${rx.alternativeSuggestion ?? 'The flagged drug will be replaced with the safety engine’s safer option.'}\n\nThe prescription is re-screened automatically.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: () => {
            const before = rx.drugs;
            const updated = applySaferAlternative(rx.id);
            if (!updated) {
              showToast({ type: 'danger', message: 'Prescription not found.' });
              return;
            }
            const added = updated.drugs.filter((d) => !before.includes(d));
            if (!added.length) {
              showToast({
                type: 'info',
                title: 'No automatic substitute',
                message: 'The engine has no mapped alternative for this drug — request doctor clarification instead.',
                action: { label: 'Ask doctor', onPress: () => openClarify(rx) },
              });
              return;
            }
            const removed = before.filter((d) => !updated.drugs.includes(d));
            markExit(rx.id, tabOf(updated));
            const safe = updated.safetyStatus === 'Safe';
            showToast({
              type: safe ? 'success' : 'warning',
              title: safe ? 'Re-screened: safe to dispense' : `Re-screened: ${updated.safetyStatus}`,
              message: `${removed.map(drugName).join(', ')} → ${added.map(drugName).join(', ')}`,
              action: tab !== 'pending' ? { label: 'Review', onPress: () => changeTab('pending') } : undefined,
            });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header
        title="Prescription Review"
        subtitle="Pharmacy • drug interaction alerts"
        rightAction={
          <PressableScale
            style={styles.enginePill}
            onPress={() => setEngineOpen(true)}
            haptic
            accessibilityRole="button"
            accessibilityLabel="Safety engine: how prescriptions are checked"
          >
            <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
            <Text style={styles.enginePillText}>Safety</Text>
          </PressableScale>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxl }]}>
        <FadeInView>
          <View style={styles.summary}>
            <View style={styles.summaryTop}>
              <View style={styles.summaryIcon}>
                <Ionicons name="medical" size={20} color={colors.primary} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.summaryTitle}>MediOS pharmacy guardrails</Text>
                <Text style={styles.summarySub}>Interaction, allergy, dose and alternative checks run on every prescription.</Text>
              </View>
            </View>
            <View style={styles.summaryStats}>
              <SummaryStat label="To review" value={counts.pending} color={colors.primary} />
              <SummaryStat label="Flagged" value={flaggedPending} color={colors.danger} />
              <SummaryStat label="On hold" value={counts.hold} color={colors.warning} />
              <SummaryStat label="Dispensed" value={counts.dispensed} color={colors.success} />
            </View>
          </View>
        </FadeInView>

        <CountTabs<Tab>
          tabs={[
            { key: 'pending', label: 'Pending', count: counts.pending, tone: flaggedPending ? 'danger' : 'default' },
            { key: 'hold', label: 'On hold', count: counts.hold, tone: 'warning' },
            { key: 'dispensed', label: 'Dispensed', count: counts.dispensed, tone: 'success' },
          ]}
          active={tab}
          onChange={changeTab}
          style={styles.tabs}
        />
        <Text style={styles.listHint}>
          {tab === 'pending'
            ? 'Awaiting pharmacist review — flagged prescriptions need action before dispensing.'
            : tab === 'hold'
              ? 'Waiting on the prescriber (doctor clarification requested).'
              : 'Dispensed prescriptions — tap one for details and any documented override.'}
        </Text>

        <View key={tab}>
          {visible.map((rx, i) => {
            const exit = exiting[rx.id];
            const ui = exit ? EXIT_UI[exit.to] : null;
            return (
              <FadeInView key={rx.id} delay={stagger(i)}>
                <ExitCollapse
                  exiting={!!exit}
                  onExited={() => clearExit(rx.id)}
                  spacing={spacing.md}
                  hold={750}
                  overlay={
                    ui ? (
                      <View style={[styles.exitStamp, { backgroundColor: ui.color + 'EB' }]}>
                        <Ionicons name={ui.icon} size={28} color="#FFFFFF" />
                        <Text style={styles.exitText}>{ui.label}</Text>
                      </View>
                    ) : null
                  }
                >
                  {tab === 'dispensed' ? (
                    <DispensedCard
                      rx={rx}
                      alerts={engine[rx.id] ?? []}
                      expanded={!!expanded[rx.id]}
                      onToggle={() => setExpanded((e) => ({ ...e, [rx.id]: !e[rx.id] }))}
                    />
                  ) : (
                    <RxCard
                      rx={rx}
                      alerts={engine[rx.id] ?? []}
                      medicines={medicines}
                      hold={tab === 'hold' ? holdNoteFor(rx) : null}
                      onDispense={() => dispense(rx)}
                      onApply={() => applyAlternative(rx)}
                      onClarify={() => openClarify(rx, tab === 'hold' ? holdNoteFor(rx)?.note : undefined)}
                      onOverride={() => setOverride({ open: true, id: rx.id })}
                    />
                  )}
                </ExitCollapse>
              </FadeInView>
            );
          })}
          {!visible.length && (
            <EmptyState
              icon={tab === 'pending' ? 'checkmark-done-outline' : tab === 'hold' ? 'pause-circle-outline' : 'bag-check-outline'}
              title={tab === 'pending' ? 'Review queue is clear' : tab === 'hold' ? 'Nothing on hold' : 'Nothing dispensed yet'}
              description={
                tab === 'pending'
                  ? 'New prescriptions from OPD consultations and IPD orders appear here automatically.'
                  : tab === 'hold'
                    ? 'Prescriptions sent back to a doctor for clarification wait here.'
                    : 'Dispensed prescriptions and their invoices appear here.'
              }
              style={styles.empty}
            />
          )}
        </View>
      </ScrollView>

      <OverrideSheet
        visible={override.open}
        rx={overrideRx}
        alerts={overrideRx ? engine[overrideRx.id] ?? [] : []}
        onClose={() => setOverride((o) => ({ ...o, open: false }))}
        onSubmit={submitOverride}
      />
      <ClarificationSheet
        visible={clarify.open}
        rx={clarifyRx}
        initialNote={clarify.note}
        onClose={() => setClarify((c) => ({ ...c, open: false }))}
        onSubmit={submitClarify}
      />
      <SafetyEngineSheet visible={engineOpen} onClose={() => setEngineOpen(false)} reviews={prescriptionReviews} />
    </SafeAreaView>
  );
}

// -------------------------------------------------------------

const SummaryStat: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <View style={styles.stat}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

type StockState = { label: string; tone: 'ok' | 'low' | 'short' | 'none' };
const stockFor = (item: { medicineId?: string; qty: number } | undefined, medicines: Medicine[]): StockState | null => {
  if (!item) return null;
  if (!item.medicineId) return { label: 'Not stocked', tone: 'none' };
  const med = medicines.find((m) => m.id === item.medicineId);
  if (!med || med.stock < item.qty) return { label: `Short • ${med?.stock ?? 0} left`, tone: 'short' };
  if (med.stock - item.qty <= LOW_STOCK_THRESHOLD) return { label: 'Low stock', tone: 'low' };
  return { label: 'In stock', tone: 'ok' };
};
const STOCK_TONE = {
  ok: { bg: colors.successLight, text: colors.successText },
  low: { bg: colors.warningLight, text: colors.warningText },
  short: { bg: colors.dangerLight, text: colors.danger },
  none: { bg: colors.cardMuted, text: colors.textSecondary },
};

const Regimen: React.FC<{ rx: PrescriptionReviewItem; medicines?: Medicine[] }> = ({ rx, medicines }) => (
  <View style={styles.regimen}>
    <Text style={styles.regimenLabel}>Prescribed regimen</Text>
    {rx.drugs.map((d, i) => {
      const item = rx.items?.[i];
      const stock = medicines ? stockFor(item, medicines) : null;
      return (
        <View key={`${d}-${i}`} style={styles.drugRow}>
          <View style={styles.drugDot} />
          <Text style={styles.drugName} numberOfLines={2}>
            {d}
          </Text>
          {item && <Text style={styles.qty}>×{item.qty}</Text>}
          {stock && (
            <View style={[styles.stock, { backgroundColor: STOCK_TONE[stock.tone].bg }]}>
              <Text style={[styles.stockText, { color: STOCK_TONE[stock.tone].text }]}>{stock.label}</Text>
            </View>
          )}
        </View>
      );
    })}
  </View>
);

interface RxCardProps {
  rx: PrescriptionReviewItem;
  alerts: SafetyAlert[];
  medicines: Medicine[];
  hold: { note: string; when: string } | null;
  onDispense: () => void;
  onApply: () => void;
  onClarify: () => void;
  onOverride: () => void;
}

const RxCard: React.FC<RxCardProps> = ({ rx, alerts, medicines, hold, onDispense, onApply, onClarify, onOverride }) => {
  const checks = computeSafetyChecks(rx, alerts);
  const failing = checks.some((c) => c.state === 'fail');
  const flagged = rx.safetyStatus !== 'Safe' || failing;
  const alternative = rx.alternativeSuggestion ?? alerts.find((a) => a.suggestion && (a.kind === 'allergy' || a.kind === 'interaction'))?.suggestion;
  const interaction = alerts.find((a) => a.kind === 'interaction');
  const allergy = alerts.find((a) => a.kind === 'allergy');
  const shortage = rx.drugs.some((_, i) => stockFor(rx.items?.[i], medicines)?.tone === 'short');

  return (
    <View style={[styles.card, flagged && (rx.safetyStatus === 'Allergy Warning' || allergy ? styles.cardAllergy : styles.cardWarn)]}>
      <View style={styles.cardTop}>
        <View style={styles.flex}>
          <View style={styles.codeRow}>
            <Text style={styles.code}>{rx.prescriptionCode}</Text>
            {!!rx.source && <Text style={styles.source}>{rx.source}</Text>}
          </View>
          <Text style={styles.patient} numberOfLines={1}>
            {rx.patientName} ({rx.age}y • {rx.gender}) • {rx.uhid}
          </Text>
          <Text style={styles.doctor}>Prescribed by {rx.doctorName}</Text>
        </View>
        <Badge label={rx.safetyStatus} variant={statusVariant(rx.safetyStatus)} size="sm" />
      </View>

      <FadeInView key={`${rx.safetyStatus}-${rx.drugs.join('|')}`} offset={6}>
        <View style={[styles.statusLine, flagged ? styles.statusBad : styles.statusOk]}>
          <Ionicons name={flagged ? 'warning' : 'checkmark-circle'} size={17} color={flagged ? colors.danger : colors.success} />
          <Text style={[styles.statusText, { color: flagged ? colors.dangerText : colors.successText }]}>
            {!flagged
              ? 'No major interactions'
              : rx.safetyStatus === 'Allergy Warning' || allergy
                ? 'Allergy conflict — do not dispense as written'
                : 'Major interaction — action needed before dispensing'}
          </Text>
        </View>

        <Regimen rx={rx} medicines={medicines} />
        <SafetyChecksRow checks={checks} />

        {(allergy || rx.allergyAlert) && (
          <View style={[styles.banner, styles.bannerAllergy]}>
            <Ionicons name="alert-circle" size={17} color={colors.danger} />
            <View style={styles.flex}>
              <Text style={[styles.bannerTitle, { color: colors.danger }]}>
                Allergy flag{allergy?.rule ? <Text style={styles.ruleTag}>  {allergy.rule}</Text> : null}
              </Text>
              <Text style={[styles.bannerText, { color: colors.dangerText }]}>{rx.allergyAlert ?? allergy?.detail}</Text>
            </View>
          </View>
        )}
        {(interaction || rx.interactionAlert) && (
          <View style={[styles.banner, styles.bannerWarn]}>
            <Ionicons name="warning" size={17} color="#D97706" />
            <View style={styles.flex}>
              <Text style={[styles.bannerTitle, { color: colors.warningText }]}>
                Drug–drug interaction{interaction?.rule ? <Text style={styles.ruleTag}>  {interaction.rule}</Text> : null}
              </Text>
              <Text style={[styles.bannerText, { color: '#B45309' }]}>{rx.interactionAlert ?? interaction?.detail}</Text>
            </View>
          </View>
        )}
        {flagged && alternative && (
          <View style={styles.altBox}>
            <Ionicons name="bulb-outline" size={16} color={colors.primary} />
            <View style={styles.flex}>
              <Text style={styles.altTitle}>Safer alternative</Text>
              <Text style={styles.altText}>{alternative}</Text>
            </View>
          </View>
        )}
      </FadeInView>

      {hold && (
        <View style={styles.holdBox}>
          <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.warningText} />
          <Text style={styles.holdText}>
            <Text style={styles.holdStrong}>Sent to {rx.doctorName} {hold.when}: </Text>
            {hold.note}
          </Text>
        </View>
      )}

      {!flagged ? (
        <View style={styles.actions}>
          {shortage && (
            <Text style={styles.shortNote}>
              <Ionicons name="alert-circle-outline" size={12} color={colors.danger} /> Some items are short — dispensing will list what's missing.
            </Text>
          )}
          <CardAction label="Dispense" icon="bag-check-outline" variant="success" onPress={onDispense} style={styles.bigAction} accessibilityLabel={`Dispense ${rx.prescriptionCode} for ${rx.patientName}`} />
        </View>
      ) : (
        <View style={styles.actions}>
          {alternative && (
            <CardAction label={hold ? 'Doctor approved alternative' : 'Apply safer alternative'} icon="swap-horizontal" onPress={onApply} style={styles.bigAction} />
          )}
          <CardAction label={hold ? 'Send another note' : 'Request doctor clarification'} icon="chatbubbles-outline" variant="outline" onPress={onClarify} style={styles.bigAction} />
          <Pressable
            onPress={onOverride}
            style={({ pressed }) => [styles.overrideLink, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel={`Override safety alert and dispense ${rx.prescriptionCode}`}
            hitSlop={6}
          >
            <Ionicons name="warning-outline" size={14} color={colors.danger} />
            <Text style={styles.overrideText}>Override & dispense</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const DispensedCard: React.FC<{ rx: PrescriptionReviewItem; alerts: SafetyAlert[]; expanded: boolean; onToggle: () => void }> = ({ rx, alerts, expanded, onToggle }) => {
  const note = overrideNote(rx);
  const [by, ...reasonParts] = (note ?? '').split(': ');
  return (
    <PressableScale
      style={styles.dispensed}
      onPress={onToggle}
      scaleTo={0.99}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={`${rx.prescriptionCode} for ${rx.patientName}, dispensed${note ? ' with override' : ''}. ${expanded ? 'Collapse' : 'Expand'} details`}
    >
      <View style={styles.dispensedTop}>
        <CheckPop size={32} color={note ? colors.warning : colors.success} />
        <View style={styles.flex}>
          <Text style={styles.code}>{rx.prescriptionCode}</Text>
          <Text style={styles.patient} numberOfLines={1}>
            {rx.patientName} • {rx.drugs.length} item{rx.drugs.length > 1 ? 's' : ''} • {rx.doctorName}
          </Text>
        </View>
        <Badge label={note ? 'Override' : 'Dispensed'} variant={note ? 'warning' : 'success'} size="sm" />
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
      </View>
      {note && (
        <View style={styles.overrideNote}>
          <Ionicons name="warning-outline" size={14} color={colors.warningText} />
          <Text style={styles.overrideNoteText}>
            <Text style={styles.holdStrong}>Override by {by}: </Text>
            {reasonParts.join(': ')}
          </Text>
        </View>
      )}
      {expanded && (
        <FadeInView offset={6}>
          <Regimen rx={rx} />
          <SafetyChecksRow checks={computeSafetyChecks(rx, alerts)} />
        </FadeInView>
      )}
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
  },
  flex: { flex: 1 },
  enginePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0D9488',
    paddingHorizontal: 12,
    minHeight: 36,
    borderRadius: radius.full,
  },
  enginePillText: {
    color: '#FFFFFF',
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.bold,
  },
  summary: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  summaryTop: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  summarySub: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.extraBold,
  },
  statLabel: {
    fontSize: 10.5,
    color: colors.textSecondary,
    marginTop: 1,
  },
  tabs: {
    marginBottom: spacing.sm,
  },
  listHint: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    ...shadows.sm,
  },
  cardWarn: {
    borderColor: colors.warning + '66',
  },
  cardAllergy: {
    borderColor: colors.danger + '55',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  code: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.primary,
  },
  source: {
    fontSize: 10,
    color: colors.textSecondary,
    backgroundColor: colors.cardMuted,
    borderRadius: radius.xs,
    paddingHorizontal: 6,
    paddingVertical: 1,
    overflow: 'hidden',
    fontWeight: typography.fontWeights.semiBold,
  },
  patient: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
    marginTop: 2,
  },
  doctor: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  statusOk: {
    backgroundColor: colors.successLight,
  },
  statusBad: {
    backgroundColor: colors.dangerLight,
  },
  statusText: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.bold,
  },
  regimen: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.sm + 2,
    marginVertical: spacing.sm,
  },
  regimenLabel: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  drugRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 3,
  },
  drugDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  drugName: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  qty: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.semiBold,
  },
  stock: {
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  stockText: {
    fontSize: 9.5,
    fontWeight: typography.fontWeights.bold,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginTop: spacing.sm,
  },
  bannerAllergy: {
    backgroundColor: colors.dangerLight,
    borderColor: '#FECACA',
  },
  bannerWarn: {
    backgroundColor: colors.warningLight,
    borderColor: '#FDE68A',
  },
  bannerTitle: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.bold,
  },
  ruleTag: {
    fontSize: 10,
    fontWeight: typography.fontWeights.extraBold,
  },
  bannerText: {
    fontSize: typography.fontSizes.xs + 0.5,
    lineHeight: 16,
    marginTop: 2,
  },
  altBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.infoLight,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginTop: spacing.sm,
  },
  altTitle: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.infoText,
  },
  altText: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: '#1D4ED8',
    lineHeight: 16,
    marginTop: 2,
  },
  holdBox: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.warningLight,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginTop: spacing.sm,
  },
  holdText: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.warningText,
    lineHeight: 16,
  },
  holdStrong: {
    fontWeight: typography.fontWeights.bold,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  bigAction: {
    minHeight: 44,
  },
  shortNote: {
    fontSize: typography.fontSizes.xs,
    color: colors.danger,
  },
  overrideLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 40,
  },
  overrideText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.danger,
    textDecorationLine: 'underline',
  },
  exitStamp: {
    flex: 1,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  exitText: {
    color: '#FFFFFF',
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
  },
  empty: {
    paddingVertical: spacing.lg,
  },
  dispensed: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    ...shadows.sm,
  },
  dispensedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  overrideNote: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.warningLight,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginTop: spacing.md,
  },
  overrideNoteText: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.warningText,
    lineHeight: 16,
  },
});
