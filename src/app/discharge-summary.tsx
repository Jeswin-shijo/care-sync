import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import type { DischargeSummary, Patient } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { pendingInvoices } from '../logic/billing';
import { canAccess, ROLE_LABEL } from '../logic/access';
import { vitalsFlags } from '../logic/clinical';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { daysFromToday } from '../utils/dates';
import { formatCurrency } from '../utils/formatters';
import { ExportAction, exportDocument } from '../utils/pdfGenerator';
import { Header } from '../components/common/Header';
import { Avatar } from '../components/common/Avatar';
import { Badge, statusVariant } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { BottomSheet } from '../components/common/BottomSheet';
import { EmptyState } from '../components/common/EmptyState';
import { SectionHeader } from '../components/common/SectionHeader';
import { BottomActionBar, useBottomBarSpace } from '../components/common/BottomActionBar';
import { PatientPicker, PatientSelectorBar } from '../components/common/PatientPicker';
import { AnimatedNumber, FadeInView, PressableScale, Skeleton, stagger } from '../components/common/Motion';
import { AccessGate } from '../components/clinical/AccessGate';
import { AllergyBanner } from '../components/clinical/AllergyBanner';
import { AnimatedTabs } from '../components/clinical/AnimatedTabs';
import { CheckItem } from '../components/clinical/CheckItem';
import { ClinicalCard, KeyValueRow } from '../components/clinical/ClinicalCard';
import { LabResultCard } from '../components/clinical/LabResultCard';
import { SafetyAlertCard } from '../components/clinical/SafetyAlertCard';
import { VitalsStrip } from '../components/clinical/VitalsStrip';
import { TimelineEntry, VisitTimeline } from '../components/clinical/VisitTimeline';
import { buildDischargeSummaryDoc } from '../components/clinical/documents';
import { friendlyDate, plural } from '../components/clinical/format';

const TABS = ['Summary', 'Treatment', 'Prescription', 'Bill'] as const;
type Tab = (typeof TABS)[number];
const STAY_BILL_TYPES = new Set(['IPD', 'Surgery', 'Lab', 'Radiology', 'Pharmacy']);

export default function DischargeSummaryRoute() {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <DischargeSummaryScreen />
    </SafeAreaView>
  );
}

function DischargeSummaryScreen() {
  const params = useLocalSearchParams<{ patientId: string }>();
  const app = useApp();
  const { patients, hospitalProfile, activeRole, setActiveRole } = app;
  // Nurses / other staff can read and share a summary; approving a discharge needs a doctor (RBAC).
  const readOnly = !canAccess(activeRole, 'discharge-summary');
  const [patientId, setPatientId] = useState<string | null>(() => (params.patientId && app.getPatient(params.patientId) ? params.patientId : null));
  const [tab, setTab] = useState<Tab>('Summary');
  const [loading, setLoading] = useState(!!patientId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportAction | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [medsReconciled, setMedsReconciled] = useState(false);
  const [vitalsReviewed, setVitalsReviewed] = useState(false);
  const [discharging, setDischarging] = useState(false);
  const barSpace = useBottomBarSpace(84);

  const patient = patientId ? app.getPatient(patientId) : undefined;
  const summary = patientId ? app.getDischargeSummary(patientId) : null;
  const hasAdmission = (p: Patient) => p.status === 'Admitted' || !!app.getDischargeSummary(p.id);

  // "Generating" the summary from the record — short and only when the patient changes.
  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, [patientId]);

  const candidates = useMemo(
    () =>
      patients
        .filter(hasAdmission)
        .sort((a, b) =>
          a.status === 'Admitted' && b.status !== 'Admitted' ? -1 : b.status === 'Admitted' && a.status !== 'Admitted' ? 1 : (b.dischargedOn ?? '') < (a.dischargedOn ?? '') ? -1 : 1
        ),
    [patients, app.dischargeSummaries]
  );

  const selectPatient = (p: Patient) => {
    if (p.id === patientId) return;
    setPatientId(p.id);
    setTab('Summary');
    setMedsReconciled(false);
    setVitalsReviewed(false);
  };

  const invoices = patient ? app.getInvoicesForPatient(patient.id) : [];
  const pending = pendingInvoices(invoices);
  const outstanding = pending.reduce((sum, i) => sum + i.amount, 0);
  const admitted = patient?.status === 'Admitted';
  const draft = summary?.status === 'Draft';

  const runExport = async (action: ExportAction, s: DischargeSummary | null = summary) => {
    if (!s || exporting) return;
    setExporting(action);
    try {
      await exportDocument(
        buildDischargeSummaryDoc({ summary: s, patient, outstanding, hospital: hospitalProfile }),
        `${s.patientName.replace(/\s+/g, '_')}_Discharge_Summary.pdf`,
        action
      );
    } finally {
      setExporting(null);
    }
  };

  const confirmDischarge = () => {
    if (!patient || discharging) return;
    setDischarging(true);
    const room = patient.room ?? 'the ward';
    setTimeout(() => {
      const res = app.dischargePatient(patient.id);
      setDischarging(false);
      setConfirmOpen(false);
      setTimeout(() => {
        if (!res.ok) {
          Alert.alert('Discharge Failed', res.error === 'NOT_ADMITTED' ? `${patient.name} is no longer admitted.` : 'Patient record not found.');
          return;
        }
        const finalSummary = res.summary;
        if (res.outstanding > 0) {
          const top = pending[0];
          Alert.alert(
            'Attention: Dues Pending',
            `${patient.name} has been discharged and ${room} released.\n\n${formatCurrency(res.outstanding)} is still outstanding${
              pending.length ? ` on ${plural(pending.length, 'bill')}` : ''
            }. Collect before the patient leaves.`,
            top
              ? [
                  { text: 'Later', style: 'cancel' },
                  { text: 'Open Bill', onPress: () => router.push({ pathname: '/receipt/[id]', params: { id: top.id } }) },
                ]
              : undefined
          );
        } else {
          Alert.alert('Discharge Complete', `${patient.name} has been discharged and ${room} released. The final summary is signed by ${finalSummary.doctorName}.`, [
            { text: 'Done', style: 'cancel' },
            { text: 'Share PDF', onPress: () => setTimeout(() => runExport('share', finalSummary), 300) },
          ]);
        }
      }, 300);
    }, 500);
  };

  // ---------------------------------------------------------------- body
  let body: React.ReactNode;
  if (!patient) {
    body = (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <PatientSelectorBar patient={null} onPress={() => setPickerOpen(true)} label="Discharge summary for" />
        <SectionHeader title="Admitted & recently discharged" meta={String(candidates.length)} />
        {candidates.length ? (
          <View style={{ gap: spacing.sm }}>
            {candidates.map((p, i) => (
              <FadeInView key={p.id} delay={stagger(i, 50, 300)} offset={10}>
                <PressableScale style={styles.candidate} onPress={() => selectPatient(p)} accessibilityRole="button" accessibilityLabel={`${p.name}, ${p.status}`}>
                  <Avatar name={p.name} size={42} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.candName} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={styles.candMeta} numberOfLines={1}>
                      {p.uhid} • {p.status === 'Admitted' ? p.room ?? 'Ward' : p.dischargedOn ? `Discharged ${friendlyDate(p.dischargedOn)}` : 'Past admission'}
                    </Text>
                  </View>
                  <Badge label={p.status} variant={statusVariant(p.status)} size="sm" />
                </PressableScale>
              </FadeInView>
            ))}
          </View>
        ) : (
          <EmptyState icon="bed-outline" title="No admissions" description="Admitted patients and past discharges appear here." />
        )}
      </ScrollView>
    );
  } else if (!summary) {
    body = (
      <View style={{ flex: 1, padding: spacing.base }}>
        <PatientSelectorBar patient={patient} onPress={() => setPickerOpen(true)} label="Discharge summary for" />
        <EmptyState
          icon="bed-outline"
          title="No admission on record"
          description={`${patient.name} has not been admitted, so there is no discharge summary. Admit the patient to start an IPD record.`}
          actionTitle="Admit to IPD"
          onActionPress={() => router.push({ pathname: '/ipd-admission', params: { patientId: patient.id } })}
          style={{ flex: 1 }}
        />
      </View>
    );
  } else {
    body = (
      <ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        contentContainerStyle={{ paddingBottom: barSpace + spacing.base }}
      >
        <View style={styles.top}>
          <PatientSelectorBar patient={patient} onPress={() => setPickerOpen(true)} label="Discharge summary for" />
          <FadeInView key={`head-${patient.id}`}>
            <View style={styles.headCard}>
              <Avatar name={patient.name} size={52} />
              <View style={{ flex: 1 }}>
                <View style={styles.headRow}>
                  <Text style={styles.headName} numberOfLines={1}>
                    {summary.patientName}
                  </Text>
                  <Badge label={summary.status ?? 'Final'} variant={draft ? 'warning' : 'success'} size="sm" />
                </View>
                <Text style={styles.headMeta}>UHID: {summary.uhid}</Text>
                <Text style={styles.headStay} numberOfLines={1}>
                  IPD • {summary.room} • {summary.stayDuration}
                </Text>
              </View>
            </View>
            {readOnly && (
              <View style={styles.roleBanner}>
                <Ionicons name="lock-closed-outline" size={15} color={colors.primaryDark} />
                <Text style={styles.roleText}>
                  View only for {ROLE_LABEL[activeRole]} — discharge approval needs the Doctor role.
                </Text>
                <TouchableOpacity onPress={() => setActiveRole('doctor')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Switch to Doctor role">
                  <Text style={styles.roleLink}>Switch</Text>
                </TouchableOpacity>
              </View>
            )}
            {draft && (
              <View style={styles.draftBanner}>
                <Ionicons name="create-outline" size={15} color={colors.warningText} />
                <Text style={styles.draftText}>
                  Draft generated from the IPD record{admitted ? ' — review, then approve to discharge and finalise.' : '.'}
                </Text>
              </View>
            )}
          </FadeInView>
        </View>
        <View style={styles.tabsSticky}>
          <AnimatedTabs tabs={TABS} active={tab} onChange={setTab} counts={{ Prescription: summary.prescriptions.length, Bill: pending.length || undefined }} />
        </View>
        <View style={styles.tabBody}>
          {loading ? (
            <View style={{ gap: spacing.md }}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={styles.skeletonCard}>
                  <Skeleton width="45%" height={14} />
                  <Skeleton height={12} style={{ marginTop: 12 }} />
                  <Skeleton width="80%" height={12} style={{ marginTop: 8 }} />
                </View>
              ))}
            </View>
          ) : (
            <FadeInView key={`${patient.id}-${tab}`} offset={8} duration={240}>
              <TabContent tab={tab} summary={summary} patient={patient} outstanding={outstanding} />
            </FadeInView>
          )}
        </View>
      </ScrollView>
    );
  }

  // ---------------------------------------------------------------- confirm sheet data
  const vitals = patient ? app.getLatestVitals(patient.id) : undefined;
  const vFlags = vitals ? vitalsFlags(vitals) : [];
  const vitalsOk = !!vitals && vFlags.length === 0;
  const followUp = patient
    ? app
        .getAppointmentsForPatient(patient.id)
        .filter((a) => daysFromToday(a.date) >= 0 && a.status !== 'Completed' && a.status !== 'Cancelled')
        .sort((a, b) => (a.date < b.date ? -1 : 1))[0]
    : undefined;
  const canConfirm = medsReconciled && (vitalsOk || vitalsReviewed) && !discharging;

  const iconBtn = (action: ExportAction, icon: 'download-outline' | 'share-social-outline' | 'print-outline', label: string) => (
    <TouchableOpacity
      key={action}
      style={styles.iconBtn}
      onPress={() => runExport(action)}
      disabled={!!exporting}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {exporting === action ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name={icon} size={20} color={colors.primary} />}
    </TouchableOpacity>
  );

  return (
    <>
      <Header title="Discharge Summary" subtitle={summary ? `${summary.patientName} • ${summary.status ?? 'Final'}` : undefined} />
      {activeRole === 'patient' ? (
        // Patients see their own summaries in the patient portal, never other patients' records.
        <AccessGate module="discharge-summary" purpose="Discharge summaries">
          {null}
        </AccessGate>
      ) : (
        <View style={{ flex: 1 }}>
          {body}
          {patient && summary && !loading && (
            <BottomActionBar style={styles.bar}>
              {admitted ? (
                <>
                  {iconBtn('download', 'download-outline', 'Download draft PDF')}
                  {iconBtn('share', 'share-social-outline', 'Share draft PDF')}
                  {readOnly ? (
                    <Button
                      title="Switch to Doctor"
                      variant="outline"
                      onPress={() => setActiveRole('doctor')}
                      size="lg"
                      style={{ flex: 1, paddingHorizontal: spacing.md }}
                    />
                  ) : (
                    <Button title="Approve & Discharge" onPress={() => setConfirmOpen(true)} size="lg" style={{ flex: 1, paddingHorizontal: spacing.md }} />
                  )}
                </>
              ) : (
                <>
                  <Button
                    title="Download PDF"
                    onPress={() => runExport('download')}
                    loading={exporting === 'download'}
                    disabled={!!exporting}
                    size="lg"
                    style={{ flex: 1 }}
                    icon={<Ionicons name="download-outline" size={18} color="#FFFFFF" />}
                  />
                  {iconBtn('share', 'share-social-outline', 'Share PDF')}
                  {iconBtn('print', 'print-outline', 'Print summary')}
                </>
              )}
            </BottomActionBar>
          )}
        </View>
      )}

      <PatientPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={selectPatient}
        selectedId={patientId}
        filter={hasAdmission}
        title="Discharge summary for"
        allowRegister={false}
      />

      <BottomSheet
        visible={confirmOpen}
        onClose={() => !discharging && setConfirmOpen(false)}
        title="Approve & Discharge"
        subtitle={patient ? `${patient.name} • ${patient.room ?? 'Ward'}` : undefined}
        footer={
          <Button
            title={discharging ? 'Discharging…' : 'Confirm Discharge'}
            onPress={confirmDischarge}
            loading={discharging}
            disabled={!canConfirm}
            variant="danger"
            fullWidth
            size="lg"
          />
        }
      >
        <Text style={styles.sheetIntro}>Discharge checklist — the bed is released and the summary is signed by {summary?.doctorName ?? 'the consultant'}.</Text>
        <CheckItem
          label="Vitals stable"
          status={vitalsOk ? 'ok' : 'warning'}
          description={
            vitals
              ? vitalsOk
                ? `Latest ${friendlyDate(vitals.date)} ${vitals.time}: BP ${vitals.bp}, SpO₂ ${vitals.spo2}%, temp ${vitals.temp}°F`
                : `Out of range: ${vFlags.map((f) => f.label).join(', ')}`
              : 'No vitals recorded for this admission'
          }
        />
        {!vitalsOk && (
          <CheckItem
            label="Reviewed by consultant — fit for discharge"
            checked={vitalsReviewed}
            onToggle={() => setVitalsReviewed((v) => !v)}
            style={styles.indent}
          />
        )}
        <CheckItem
          label="Medications reconciled"
          description={summary?.prescriptions.length ? `${plural(summary.prescriptions.length, 'discharge medicine')} explained to the patient / attendant` : 'No take-home medicines'}
          checked={medsReconciled}
          onToggle={() => setMedsReconciled((v) => !v)}
        />
        <CheckItem
          label="Bill cleared"
          status={outstanding > 0 ? 'warning' : 'ok'}
          description={outstanding > 0 ? `${formatCurrency(outstanding)} pending on ${plural(pending.length, 'bill')} — collect or approve credit` : 'No pending dues'}
          actionLabel={outstanding > 0 && pending[0] ? 'Open bill' : undefined}
          onAction={
            pending[0]
              ? () => {
                  setConfirmOpen(false);
                  setTimeout(() => router.push({ pathname: '/receipt/[id]', params: { id: pending[0].id } }), 240);
                }
              : undefined
          }
        />
        <CheckItem
          label="Follow-up booked"
          status={followUp ? 'ok' : 'warning'}
          description={followUp ? `${friendlyDate(followUp.date)} at ${followUp.time} with ${followUp.doctorName}` : 'No follow-up appointment yet'}
          actionLabel={followUp ? undefined : 'Book follow-up'}
          onAction={
            followUp || !patient
              ? undefined
              : () => {
                  setConfirmOpen(false);
                  setTimeout(() => router.push({ pathname: '/book-appointment', params: { patientId: patient.id } }), 240);
                }
          }
        />
        {!canConfirm && !discharging && (
          <Text style={styles.sheetHint}>Tick “Medications reconciled”{vitalsOk ? '' : ' and the vitals review'} to enable discharge.</Text>
        )}
      </BottomSheet>
    </>
  );
}

// -------------------------------------------------------------
// Tabs
// -------------------------------------------------------------
function TabContent({ tab, summary, patient, outstanding }: { tab: Tab; summary: DischargeSummary; patient: Patient; outstanding: number }) {
  const app = useApp();
  const profile = app.getProfile(patient.id);
  const draft = summary.status === 'Draft';

  if (tab === 'Summary') {
    return (
      <View style={styles.stack}>
        <AllergyBanner allergies={profile?.allergies} />
        <ClinicalCard title="Admission Details" icon="bed-outline" iconColor={colors.purple}>
          <KeyValueRow label="Admitted" value={summary.admissionDate} />
          <KeyValueRow label={draft ? 'Planned discharge' : 'Discharged'} value={summary.dischargeDate} />
          <KeyValueRow label="Length of stay" value={summary.stayDuration} />
          <KeyValueRow label="Room / Ward" value={summary.room} />
          <KeyValueRow label="Department" value={summary.department} />
          <KeyValueRow label="Consultant" value={summary.doctorName} last />
        </ClinicalCard>
        <ClinicalCard title="Diagnosis" icon="medkit-outline">
          <Text style={styles.bodyStrong}>{summary.diagnosis}</Text>
        </ClinicalCard>
        <ClinicalCard title="Advice" icon="list-outline" iconColor={colors.teal}>
          <View style={{ gap: 8 }}>
            {summary.advice.map((a) => (
              <View key={a} style={styles.bullet}>
                <View style={styles.bulletDot} />
                <Text style={styles.body}>{a}</Text>
              </View>
            ))}
          </View>
        </ClinicalCard>
      </View>
    );
  }

  if (tab === 'Treatment') {
    const admittedIso = patient.admittedOn ?? '';
    const course: TimelineEntry[] = app
      .getVisits(patient.id)
      .filter((v) => (v.type === 'IPD' || v.type === 'Emergency') && (!admittedIso || v.date >= admittedIso))
      .map((v) => ({
        id: v.id,
        dateISO: v.date,
        title: v.diagnosis,
        subtitle: `${v.type} • ${v.doctorName}`,
        icon: v.type === 'Emergency' ? 'medkit-outline' : 'bed-outline',
        color: v.type === 'Emergency' ? colors.danger : colors.purple,
        details: v.symptoms ? <Text style={styles.body}>{v.symptoms}</Text> : undefined,
      }));
    const labs = app.getLabResults(patient.id).filter((s) => !admittedIso || (s.date ?? '') >= admittedIso);
    return (
      <View style={styles.stack}>
        <ClinicalCard title="Treatment Given" icon="medical-outline" iconColor={colors.teal}>
          <Text style={styles.body}>{summary.treatmentGiven}</Text>
        </ClinicalCard>
        <ClinicalCard title="Condition at Discharge" icon="pulse" iconColor={colors.danger}>
          <VitalsStrip vitals={app.getLatestVitals(patient.id)} />
        </ClinicalCard>
        {course.length > 0 && (
          <View>
            <SectionHeader title="Course in Hospital" meta={plural(course.length, 'entry', 'entries')} style={{ marginTop: spacing.xs }} />
            <VisitTimeline entries={course} />
          </View>
        )}
        <View>
          <SectionHeader title="Investigations" meta={labs.length ? String(labs.length) : undefined} style={{ marginTop: spacing.xs }} />
          {labs.length ? (
            <View style={styles.stack}>
              {labs.map((s) => (
                <LabResultCard
                  key={s.id}
                  sample={s}
                  onPress={() => router.push({ pathname: '/doctor-copilot', params: { patientId: patient.id, tab: 'Reports' } })}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.muted}>No lab results during this admission.</Text>
          )}
        </View>
      </View>
    );
  }

  if (tab === 'Prescription') {
    const alerts = summary.prescriptions.length
      ? app.checkDrugsForPatient(
          patient.id,
          summary.prescriptions.map((p) => p.name)
        )
      : [];
    return (
      <View style={styles.stack}>
        {summary.prescriptions.length ? (
          <ClinicalCard title="Discharge Medicines" icon="medkit-outline" iconColor={colors.teal} meta="Continue at home as prescribed">
            {summary.prescriptions.map((rx, i) => (
              <View key={`${rx.name}-${i}`} style={[styles.rxRow, i < summary.prescriptions.length - 1 && styles.divider]}>
                <View style={styles.rxIndex}>
                  <Text style={styles.rxIndexText}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rxName}>{rx.name}</Text>
                  <Text style={styles.rxDose}>{rx.dosage}</Text>
                </View>
                <View style={styles.rxDuration}>
                  <Text style={styles.rxDurationText}>{rx.duration}</Text>
                </View>
              </View>
            ))}
          </ClinicalCard>
        ) : (
          <EmptyState icon="medkit-outline" title="No discharge medicines" description="Nothing to continue at home." />
        )}
        {summary.prescriptions.length > 0 &&
          (alerts.length ? (
            alerts.map((a, i) => <SafetyAlertCard key={`${a.rule}-${a.title}`} alert={a} delay={i * 60} />)
          ) : (
            <View style={styles.safeBox}>
              <Ionicons name="shield-checkmark" size={18} color={colors.success} />
              <Text style={styles.safeText}>Checked against allergies, current medicines and renal / liver function — no conflicts.</Text>
            </View>
          ))}
      </View>
    );
  }

  // Bill
  const invoices = app
    .getInvoicesForPatient(patient.id)
    .filter((i) => STAY_BILL_TYPES.has(i.type))
    .sort((a, b) => ((b.dateISO ?? '') < (a.dateISO ?? '') ? -1 : 1));
  const pending = invoices.filter((i) => i.status === 'Pending');
  const openInvoice = (id: string) => router.push({ pathname: '/receipt/[id]', params: { id } });
  return (
    <View style={styles.stack}>
      <View style={styles.billHero}>
        <Text style={styles.billHeroLabel}>Total charges</Text>
        <AnimatedNumber value={summary.totalAmount} format={(n) => formatCurrency(Math.round(n))} style={styles.billHeroValue} />
        <Text style={styles.billHeroSub}>{outstanding > 0 ? `${formatCurrency(outstanding)} outstanding` : 'No dues pending'}</Text>
      </View>
      <ClinicalCard title="Bill Summary" icon="receipt-outline" iconColor={colors.success}>
        <KeyValueRow label="Total charges" value={formatCurrency(summary.totalAmount)} />
        <KeyValueRow label="Insurance approved" value={summary.insuranceApproved ? `- ${formatCurrency(summary.insuranceApproved)}` : '₹0'} valueColor={summary.insuranceApproved ? colors.success : undefined} />
        <KeyValueRow label="Paid by patient" value={formatCurrency(summary.patientPaid)} />
        <KeyValueRow label="Outstanding" value={outstanding > 0 ? formatCurrency(outstanding) : 'Nil'} strong valueColor={outstanding > 0 ? colors.danger : colors.success} last />
      </ClinicalCard>
      {pending.length > 0 && (
        <ClinicalCard title="Pending Bills" icon="alert-circle-outline" iconColor={colors.danger} meta="Tap to collect payment">
          {pending.map((inv, i) => (
            <PressableScale key={inv.id} style={[styles.billRow, i < pending.length - 1 && styles.divider]} onPress={() => openInvoice(inv.id)} accessibilityRole="button">
              <View style={{ flex: 1 }}>
                <Text style={styles.billTitle} numberOfLines={1}>
                  {inv.title}
                </Text>
                <Text style={styles.billMeta}>
                  {inv.invoiceNo} • {inv.date}
                </Text>
              </View>
              <Text style={[styles.billAmount, { color: colors.danger }]}>{formatCurrency(inv.amount)}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </PressableScale>
          ))}
        </ClinicalCard>
      )}
      <ClinicalCard title="Admission Bills" icon="documents-outline" meta={invoices.length ? plural(invoices.length, 'bill') : undefined}>
        {invoices.length ? (
          invoices.map((inv, i) => (
            <PressableScale key={inv.id} style={[styles.billRow, i < invoices.length - 1 && styles.divider]} onPress={() => openInvoice(inv.id)} accessibilityRole="button">
              <View style={{ flex: 1 }}>
                <Text style={styles.billTitle} numberOfLines={1}>
                  {inv.title}
                </Text>
                <Text style={styles.billMeta}>
                  {inv.invoiceNo} • {inv.date}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={styles.billAmount}>{formatCurrency(inv.amount)}</Text>
                <Badge label={inv.status} variant={statusVariant(inv.status)} size="sm" />
              </View>
            </PressableScale>
          ))
        ) : (
          <Text style={styles.muted}>No bills raised for this admission.</Text>
        )}
      </ClinicalCard>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.base, paddingBottom: spacing.xxl },
  top: { paddingHorizontal: spacing.base, paddingTop: spacing.base, paddingBottom: spacing.md, gap: spacing.md, backgroundColor: colors.background },
  headCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headName: { flex: 1, fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.bold, color: colors.text },
  headMeta: { fontSize: typography.fontSizes.xs + 1, color: colors.textSecondary, marginTop: 2 },
  headStay: { fontSize: typography.fontSizes.xs + 1, color: colors.purple, fontWeight: typography.fontWeights.semiBold, marginTop: 3 },
  draftBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: colors.warningLight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warning + '55',
    padding: spacing.sm + 2,
    marginTop: spacing.sm,
  },
  draftText: { flex: 1, fontSize: typography.fontSizes.xs + 1, color: colors.warningText, lineHeight: 17 },
  roleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginTop: spacing.sm,
  },
  roleText: { flex: 1, fontSize: typography.fontSizes.xs + 1, color: colors.primaryDark, lineHeight: 17 },
  roleLink: { fontSize: typography.fontSizes.sm - 1, fontWeight: typography.fontWeights.bold, color: colors.primary },
  tabsSticky: { backgroundColor: '#FFFFFF' },
  tabBody: { paddingHorizontal: spacing.base, paddingTop: spacing.base },
  stack: { gap: spacing.md },
  skeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.base,
  },
  candidate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    ...shadows.sm,
  },
  candName: { fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.bold, color: colors.text },
  candMeta: { fontSize: typography.fontSizes.xs + 1, color: colors.textSecondary, marginTop: 2 },
  body: { flex: 1, fontSize: typography.fontSizes.sm + 1, color: colors.text, lineHeight: 21 },
  bodyStrong: { fontSize: typography.fontSizes.md, color: colors.text, fontWeight: typography.fontWeights.semiBold, lineHeight: 22 },
  muted: { fontSize: typography.fontSizes.sm, color: colors.textMuted },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.teal, marginTop: 8 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  rxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm + 2 },
  rxIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rxIndexText: { fontSize: 12, fontWeight: typography.fontWeights.bold, color: colors.teal },
  rxName: { fontSize: typography.fontSizes.sm + 1, fontWeight: typography.fontWeights.bold, color: colors.text },
  rxDose: { fontSize: typography.fontSizes.xs + 1, color: colors.textSecondary, marginTop: 2 },
  rxDuration: { backgroundColor: colors.cardMuted, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  rxDurationText: { fontSize: 11, fontWeight: typography.fontWeights.bold, color: colors.textSecondary },
  safeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successLight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.success + '40',
    padding: spacing.md,
  },
  safeText: { flex: 1, fontSize: typography.fontSizes.sm - 1, color: colors.successText, lineHeight: 18 },
  billHero: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.base,
    ...shadows.md,
  },
  billHeroLabel: { fontSize: typography.fontSizes.sm, color: '#FFFFFFCC', fontWeight: typography.fontWeights.semiBold },
  billHeroValue: { fontSize: 28, fontWeight: typography.fontWeights.extraBold, color: '#FFFFFF', marginTop: 2 },
  billHeroSub: { fontSize: typography.fontSizes.xs + 1, color: '#FFFFFFE6', marginTop: 2 },
  billRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm + 2, minHeight: 52 },
  billTitle: { fontSize: typography.fontSizes.sm + 1, fontWeight: typography.fontWeights.semiBold, color: colors.text },
  billMeta: { fontSize: typography.fontSizes.xs, color: colors.textSecondary, marginTop: 2 },
  billAmount: { fontSize: typography.fontSizes.sm + 1, fontWeight: typography.fontWeights.bold, color: colors.text },
  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary + '55',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  sheetIntro: { fontSize: typography.fontSizes.sm, color: colors.textSecondary, lineHeight: 19, marginBottom: spacing.xs },
  indent: { marginLeft: 34 },
  sheetHint: { fontSize: typography.fontSizes.xs + 1, color: colors.textMuted, marginTop: spacing.sm },
});
