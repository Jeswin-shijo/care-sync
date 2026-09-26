import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type {
  Appointment,
  ClinicalNote,
  ClinicalProfile,
  Invoice,
  LabSample,
  Patient,
  PatientDocument,
  RadiologyOrder,
  Visit,
  VitalsRecord,
} from '../../data/mockData';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { clockToMinutes, daysFromToday, formatDisplayDate } from '../../utils/dates';
import { formatCurrency } from '../../utils/formatters';
import { Badge, BadgeVariant, statusVariant } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { SectionHeader } from '../common/SectionHeader';
import { FadeInView, PressableScale, Skeleton, stagger } from '../common/Motion';
import { AllergyBanner } from './AllergyBanner';
import { ClinicalCard, InfoRow, KeyValueRow } from './ClinicalCard';
import { friendlyDate, plural, stayDay } from './format';
import { LabResultCard } from './LabResultCard';
import { rxSummary } from './rx';
import { VitalsStrip } from './VitalsStrip';
import { DetailBlock, TimelineEntry, VisitTimeline } from './VisitTimeline';

// -------------------------------------------------------------
// Shared bits
// -------------------------------------------------------------
const VISIT_BADGE: Record<Visit['type'], BadgeVariant> = {
  OPD: 'info',
  IPD: 'admitted',
  'Follow Up': 'completed',
  Emergency: 'danger',
};

const VISIT_COLOR: Record<Visit['type'], string> = {
  OPD: colors.primary,
  IPD: colors.purple,
  'Follow Up': colors.teal,
  Emergency: colors.danger,
};

export const isUpcomingAppointment = (a: Appointment) =>
  daysFromToday(a.date) >= 0 && a.status !== 'Completed' && a.status !== 'Cancelled';

const byDateTimeAsc = (a: { date: string; time?: string }, b: { date: string; time?: string }) =>
  a.date === b.date ? clockToMinutes(a.time ?? '') - clockToMinutes(b.time ?? '') : a.date < b.date ? -1 : 1;

const InlineEmpty: React.FC<{ icon: React.ComponentProps<typeof Ionicons>['name']; text: string }> = ({ icon, text }) => (
  <View style={styles.inlineEmpty}>
    <Ionicons name={icon} size={18} color={colors.textMuted} />
    <Text style={styles.inlineEmptyText}>{text}</Text>
  </View>
);

const Bullets: React.FC<{ items: string[]; empty: string; color?: string }> = ({ items, empty, color = colors.primary }) =>
  items.length ? (
    <View style={{ gap: 8 }}>
      {items.map((item) => (
        <View key={item} style={styles.bulletRow}>
          <View style={[styles.bulletDot, { backgroundColor: color }]} />
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  ) : (
    <Text style={styles.muted}>{empty}</Text>
  );

// -------------------------------------------------------------
// Overview
// -------------------------------------------------------------
interface OverviewTabProps {
  patient: Patient;
  profile?: ClinicalProfile;
  vitals?: VitalsRecord;
  visits: Visit[];
  appointments: Appointment[];
  hasSummary: boolean;
  onViewVisits: () => void;
  onCall: () => void;
  onOpenSummary: () => void;
  onOpenCopilot: () => void;
  onOpenAppointments: (dateISO: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  patient,
  profile,
  vitals,
  visits,
  appointments,
  hasSummary,
  onViewVisits,
  onCall,
  onOpenSummary,
  onOpenCopilot,
  onOpenAppointments,
}) => {
  const admitted = patient.status === 'Admitted';
  const day = stayDay(patient.admittedOn);
  const next = appointments.filter(isUpcomingAppointment).sort(byDateTimeAsc)[0];
  const cards: React.ReactNode[] = [];

  if (admitted) {
    cards.push(
      <ClinicalCard
        key="admission"
        title="Current Admission"
        icon="bed"
        iconColor={colors.purple}
        meta={day ? `Day ${day} of stay` : undefined}
        actionLabel={hasSummary ? 'Discharge summary' : undefined}
        onAction={onOpenSummary}
      >
        <InfoRow icon="business-outline" iconColor={colors.purple} label="Room / Bed" value={patient.room ?? 'Bed not assigned'} />
        <InfoRow
          icon="calendar-outline"
          iconColor={colors.purple}
          label="Admitted on"
          value={patient.admittedOn ? `${formatDisplayDate(patient.admittedOn)} (${friendlyDate(patient.admittedOn)})` : '—'}
        />
        <InfoRow icon="medkit-outline" iconColor={colors.purple} label="Department" value={patient.department ?? '—'} />
        <InfoRow icon="person-outline" iconColor={colors.purple} label="Attending doctor" value={patient.attendingDoctor ?? '—'} last />
      </ClinicalCard>
    );
  }

  cards.push(
    <ClinicalCard key="vitals" title="Latest Vitals" icon="pulse" iconColor={colors.danger} actionLabel="Copilot" onAction={onOpenCopilot}>
      <VitalsStrip vitals={vitals} />
    </ClinicalCard>
  );

  if (profile?.riskFlags.length) {
    cards.push(
      <ClinicalCard key="flags" title="Clinical Flags" icon="sparkles" iconColor={colors.warning} meta="MediOS rules engine • verify clinically">
        <View style={{ gap: 8 }}>
          {profile.riskFlags.map((f) => (
            <View key={f} style={styles.flagRow}>
              <Ionicons name="alert-circle" size={15} color={colors.warning} />
              <Text style={styles.flagText}>{f}</Text>
            </View>
          ))}
        </View>
      </ClinicalCard>
    );
  }

  cards.push(
    <ClinicalCard key="personal" title="Personal Information" icon="person-circle-outline">
      <InfoRow icon="calendar-outline" label="Date of Birth" value={`${patient.dob} • ${patient.age} yrs`} />
      <InfoRow icon="call-outline" label="Mobile" value={patient.phone} onPress={onCall} />
      {!!patient.email && <InfoRow icon="mail-outline" label="Email" value={patient.email} />}
      <InfoRow icon="location-outline" label="Address" value={patient.address} />
      <InfoRow icon="water-outline" iconColor={colors.danger} label="Blood Group" value={patient.bloodGroup} />
      <InfoRow icon="shield-checkmark-outline" iconColor={colors.success} label="Insurance" value={patient.insurance} />
      <InfoRow
        icon="people-outline"
        iconColor={colors.orange}
        label="Emergency Contact"
        value={patient.emergencyContact ?? 'Not recorded'}
        valueColor={patient.emergencyContact ? undefined : colors.textMuted}
      />
      <InfoRow icon="id-card-outline" iconColor={colors.teal} label="Registered on" value={formatDisplayDate(patient.registeredDate)} last />
    </ClinicalCard>
  );

  if (!admitted && patient.admittedOn) {
    cards.push(
      <ClinicalCard
        key="last-admission"
        title="Last Admission"
        icon="bed-outline"
        iconColor={colors.purple}
        actionLabel={hasSummary ? 'Summary' : undefined}
        onAction={onOpenSummary}
      >
        <KeyValueRow label="Admitted" value={formatDisplayDate(patient.admittedOn)} />
        <KeyValueRow label="Discharged" value={patient.dischargedOn ? formatDisplayDate(patient.dischargedOn) : '—'} />
        <KeyValueRow label="Department" value={patient.department ?? '—'} />
        <KeyValueRow label="Consultant" value={patient.attendingDoctor ?? '—'} last />
      </ClinicalCard>
    );
  }

  if (next) {
    cards.push(
      <ClinicalCard key="next" title="Next Appointment" icon="calendar" iconColor={colors.teal}>
        <PressableScale style={styles.listRow} onPress={() => onOpenAppointments(next.date)} accessibilityRole="button">
          <View style={[styles.rowIcon, { backgroundColor: colors.tealLight }]}>
            <Ionicons name="time-outline" size={18} color={colors.teal} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>
              {friendlyDate(next.date)} • {next.time}
            </Text>
            <Text style={styles.rowSub} numberOfLines={1}>
              {next.doctorName} • {next.department} • Token {next.tokenNo}
            </Text>
          </View>
          <Badge label={next.status} variant={statusVariant(next.status)} size="sm" />
        </PressableScale>
      </ClinicalCard>
    );
  }

  cards.push(
    <ClinicalCard key="visits" title="Recent Visits" icon="document-text-outline" actionLabel={visits.length ? 'View All' : undefined} onAction={onViewVisits}>
      {visits.length ? (
        visits.slice(0, 2).map((v, i) => (
          <PressableScale key={v.id} style={[styles.listRow, i === 0 && visits.length > 1 && styles.rowDivider]} onPress={onViewVisits}>
            <View style={[styles.rowIcon, { backgroundColor: VISIT_COLOR[v.type] + '18' }]}>
              <Ionicons name="document-text-outline" size={18} color={VISIT_COLOR[v.type]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {v.type} - {v.department}
              </Text>
              <Text style={styles.rowSub} numberOfLines={1}>
                {formatDisplayDate(v.date)} • {v.doctorName}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </PressableScale>
        ))
      ) : (
        <InlineEmpty icon="document-text-outline" text="No visits recorded yet." />
      )}
    </ClinicalCard>
  );

  return (
    <View style={styles.stack}>
      {cards.map((c, i) => (
        <FadeInView key={i} delay={stagger(i, 60, 300)} offset={12}>
          {c}
        </FadeInView>
      ))}
    </View>
  );
};

// -------------------------------------------------------------
// Medical history
// -------------------------------------------------------------
export const HistoryTab: React.FC<{ profile?: ClinicalProfile; onStartConsult: () => void }> = ({ profile, onStartConsult }) => {
  if (!profile) {
    return (
      <EmptyState
        icon="document-text-outline"
        title="No clinical history yet"
        description="Allergies, conditions and medications appear here after the first consultation."
        actionTitle="Start Consultation"
        onActionPress={onStartConsult}
      />
    );
  }
  const complaint = /^New registration/i.test(profile.chiefComplaint) ? null : profile.chiefComplaint;
  const cards: React.ReactNode[] = [
    <ClinicalCard key="allergy" title="Allergies" icon="warning-outline" iconColor={colors.danger}>
      <AllergyBanner allergies={profile.allergies} />
    </ClinicalCard>,
    <ClinicalCard key="complaint" title="Presenting Complaint" icon="chatbubble-ellipses-outline">
      {complaint ? (
        <View style={styles.quote}>
          <Text style={styles.quoteText}>{complaint}</Text>
        </View>
      ) : (
        <Text style={styles.muted}>No consultation recorded yet.</Text>
      )}
    </ClinicalCard>,
    <ClinicalCard key="conditions" title="Medical Conditions" icon="fitness-outline" meta={profile.conditions.length ? plural(profile.conditions.length, 'condition') : undefined}>
      {profile.conditions.length ? (
        <View style={styles.chipWrap}>
          {profile.conditions.map((c) => (
            <View key={c} style={styles.condChip}>
              <Text style={styles.condText}>{c}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.muted}>No chronic conditions recorded.</Text>
      )}
    </ClinicalCard>,
    <ClinicalCard key="meds" title="Current Medications" icon="medical-outline" iconColor={colors.teal}>
      {profile.currentMedications.length ? (
        profile.currentMedications.map((m, i) => (
          <View key={m} style={[styles.medRow, i < profile.currentMedications.length - 1 && styles.rowDivider]}>
            <View style={[styles.rowIcon, { backgroundColor: colors.tealLight, width: 32, height: 32 }]}>
              <Ionicons name="medical" size={15} color={colors.teal} />
            </View>
            <Text style={styles.medText}>{m}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.muted}>Not on any regular medication.</Text>
      )}
    </ClinicalCard>,
    <ClinicalCard key="surgical" title="Surgical History" icon="cut-outline" iconColor={colors.purple}>
      <Bullets items={profile.surgicalHistory.filter((s) => s.toLowerCase() !== 'none')} empty="No previous surgery." color={colors.purple} />
    </ClinicalCard>,
    <ClinicalCard key="family" title="Family History" icon="people-outline" iconColor={colors.orange}>
      <Bullets items={profile.familyHistory.filter((s) => !/non-contributory/i.test(s))} empty="Non-contributory." color={colors.orange} />
    </ClinicalCard>,
    <ClinicalCard key="lifestyle" title="Lifestyle" icon="leaf-outline" iconColor={colors.success}>
      <Text style={profile.lifestyle ? styles.body : styles.muted}>{profile.lifestyle || 'Not recorded.'}</Text>
    </ClinicalCard>,
  ];
  return (
    <View style={styles.stack}>
      {cards.map((c, i) => (
        <FadeInView key={i} delay={stagger(i, 50, 300)} offset={12}>
          {c}
        </FadeInView>
      ))}
    </View>
  );
};

// -------------------------------------------------------------
// Visits timeline
// -------------------------------------------------------------
interface VisitsTabProps {
  visits: Visit[];
  appointments: Appointment[];
  notes: ClinicalNote[];
  onBook: () => void;
  onStartConsult: (appointmentId?: string) => void;
  onOpenAppointments: (dateISO: string) => void;
}

const visitEntry = (v: Visit): TimelineEntry => ({
  id: v.id,
  dateISO: v.date,
  title: v.diagnosis || `${v.type} consultation`,
  subtitle: `${v.type} • ${v.department} • ${v.doctorName}`,
  badge: { label: v.type, variant: VISIT_BADGE[v.type] },
  icon: v.type === 'IPD' ? 'bed-outline' : v.type === 'Emergency' ? 'medkit-outline' : 'document-text-outline',
  color: VISIT_COLOR[v.type],
  details: (
    <>
      <DetailBlock label="Symptoms / notes">{v.symptoms || '—'}</DetailBlock>
      <DetailBlock label="Diagnosis">{v.diagnosis || '—'}</DetailBlock>
      {v.prescription.length > 0 && (
        <DetailBlock label={`Prescription (${v.prescription.length})`}>
          <View style={{ gap: 4 }}>
            {v.prescription.map((l, i) => (
              <Text key={`${l.name}-${i}`} style={styles.body}>
                <Text style={styles.bold}>{l.name}</Text> — {rxSummary(l)}
              </Text>
            ))}
          </View>
        </DetailBlock>
      )}
      {!!v.advice && <DetailBlock label="Advice">{v.advice}</DetailBlock>}
      {!!v.followUpDate && <DetailBlock label="Follow-up">{`${friendlyDate(v.followUpDate)} (${formatDisplayDate(v.followUpDate)})`}</DetailBlock>}
      {!!v.source && <Text style={styles.source}>Source: {v.source}</Text>}
    </>
  ),
});

const noteEntry = (n: ClinicalNote): TimelineEntry => ({
  id: n.id,
  dateISO: n.date,
  time: n.time,
  title: `Clinical note (${n.source})`,
  subtitle: `${n.author}${n.approvedBy && n.approvedBy !== n.author ? ` • approved by ${n.approvedBy}` : ''}`,
  badge: { label: n.status, variant: n.status === 'Approved' ? 'success' : 'warning' },
  icon: n.source === 'Voice' ? 'mic-outline' : n.source === 'AI Draft' ? 'sparkles-outline' : 'create-outline',
  color: colors.teal,
  details: (
    <View style={{ gap: 6 }}>
      {n.content.split('\n').map((line, i) => {
        const m = /^([SOAP]):\s*(.*)$/.exec(line.trim());
        return (
          <Text key={i} style={styles.body}>
            {m ? <Text style={styles.bold}>{{ S: 'Subjective', O: 'Objective', A: 'Assessment', P: 'Plan' }[m[1] as 'S']}: </Text> : null}
            {m ? m[2] : line}
          </Text>
        );
      })}
    </View>
  ),
});

export const VisitsTab: React.FC<VisitsTabProps> = ({ visits, appointments, notes, onBook, onStartConsult, onOpenAppointments }) => {
  const aptEntry = (a: Appointment): TimelineEntry => {
    const today = daysFromToday(a.date) === 0;
    const startable = today && (a.status === 'Confirmed' || a.status === 'Waiting' || a.status === 'In Consultation');
    const upcoming = isUpcomingAppointment(a);
    return {
      id: a.id,
      dateISO: a.date,
      time: a.time,
      title: `${a.type === 'Follow Up' ? 'Follow-up' : a.type} appointment • ${a.department}`,
      subtitle: `${a.doctorName} • Token ${a.tokenNo}${a.reason ? ` • ${a.reason}` : ''}`,
      badge: { label: a.status, variant: statusVariant(a.status) },
      icon: 'calendar-outline',
      color: a.status === 'Not Arrived' ? colors.danger : colors.teal,
      onPress: upcoming ? () => (startable ? onStartConsult(a.id) : onOpenAppointments(a.date)) : undefined,
      actionText: startable ? 'Start consultation' : upcoming ? 'Open schedule' : undefined,
      details: upcoming ? undefined : a.reason ? <DetailBlock label="Reason for visit">{a.reason}</DetailBlock> : undefined,
    };
  };

  const upcoming = appointments.filter(isUpcomingAppointment).sort(byDateTimeAsc).map(aptEntry);
  const history = [
    ...visits.map(visitEntry),
    ...appointments.filter((a) => !isUpcomingAppointment(a)).map(aptEntry),
    ...notes.map(noteEntry),
  ].sort((a, b) =>
    a.dateISO === b.dateISO ? clockToMinutes(b.time ?? '') - clockToMinutes(a.time ?? '') : a.dateISO < b.dateISO ? 1 : -1
  );

  return (
    <View>
      {upcoming.length > 0 && (
        <>
          <SectionHeader title="Upcoming" meta={plural(upcoming.length, 'appointment')} style={styles.firstHeader} />
          <VisitTimeline entries={upcoming} />
        </>
      )}
      <SectionHeader
        title="History"
        meta={plural(history.length, 'record')}
        actionLabel="Book visit"
        onActionPress={onBook}
        style={upcoming.length ? undefined : styles.firstHeader}
      />
      {history.length ? (
        <VisitTimeline entries={history} defaultExpandedId={history.find((h) => h.details)?.id} />
      ) : (
        <EmptyState icon="calendar-outline" title="No visits yet" description="Consultations, admissions and notes will build a timeline here." actionTitle="Book Appointment" onActionPress={onBook} />
      )}
    </View>
  );
};

// -------------------------------------------------------------
// Reports
// -------------------------------------------------------------
interface ReportsTabProps {
  ready: boolean;
  labResults: LabSample[];
  labOrders: LabSample[];
  radiology: RadiologyOrder[];
  invoices: Invoice[];
  documents: PatientDocument[];
  onOpenCopilot: () => void;
  onOrderLab: () => void;
  onOrderScan: () => void;
  onOpenInvoice: (invoiceId: string) => void;
  onOpenDocuments: () => void;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  ready,
  labResults,
  labOrders,
  radiology,
  invoices,
  documents,
  onOpenCopilot,
  onOrderLab,
  onOrderScan,
  onOpenInvoice,
  onOpenDocuments,
}) => {
  if (!ready) {
    return (
      <View style={[styles.stack, { marginTop: spacing.base }]}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.skeletonCard}>
            <Skeleton width="55%" height={14} />
            <Skeleton width="35%" height={10} style={{ marginTop: 8 }} />
            <Skeleton height={44} radius={10} style={{ marginTop: 12 }} />
          </View>
        ))}
      </View>
    );
  }
  const pending = labOrders.filter((s) => s.status === 'New' || s.status === 'Processing');
  const bills = [...invoices].sort((a, b) => ((b.dateISO ?? '') < (a.dateISO ?? '') ? -1 : (b.dateISO ?? '') > (a.dateISO ?? '') ? 1 : 0));
  const outstanding = invoices.filter((i) => i.status === 'Pending').reduce((sum, i) => sum + i.amount, 0);

  return (
    <View>
      <SectionHeader title="Lab Results" meta={labResults.length ? String(labResults.length) : undefined} actionLabel="Order tests" onActionPress={onOrderLab} style={styles.firstHeader} />
      {labResults.length ? (
        <View style={styles.stack}>
          {labResults.map((s, i) => (
            <FadeInView key={s.id} delay={stagger(i, 60, 300)} offset={10}>
              <LabResultCard sample={s} onPress={onOpenCopilot} />
            </FadeInView>
          ))}
        </View>
      ) : (
        <InlineEmpty icon="flask-outline" text="No lab results on record." />
      )}

      {pending.length > 0 && (
        <ClinicalCard title="Pending Lab Orders" icon="hourglass-outline" iconColor={colors.warning} style={{ marginTop: spacing.md }}>
          {pending.map((s, i) => (
            <View key={s.id} style={[styles.listRow, i < pending.length - 1 && styles.rowDivider]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {s.testName}
                </Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {s.sampleCode} • {friendlyDate(s.date)} • {s.turnaroundTime}
                </Text>
              </View>
              <Badge label={s.status} variant={statusVariant(s.status)} size="sm" />
            </View>
          ))}
        </ClinicalCard>
      )}

      <SectionHeader title="Radiology" meta={radiology.length ? String(radiology.length) : undefined} actionLabel="Order scan" onActionPress={onOrderScan} />
      {radiology.length ? (
        <View style={styles.stack}>
          {radiology.map((r) => (
            <ClinicalCard
              key={r.id}
              title={r.scanName}
              icon="scan-outline"
              iconColor={colors.purple}
              meta={`${friendlyDate(r.date)} • ${r.time} • ${r.orderedBy}`}
              right={<Badge label={r.status} variant={statusVariant(r.status)} size="sm" />}
            >
              {r.status === 'Reported' ? (
                <View style={{ gap: 6 }}>
                  {!!r.impression && (
                    <Text style={styles.body}>
                      <Text style={styles.bold}>Impression: </Text>
                      {r.impression}
                    </Text>
                  )}
                  {!!r.findings && <Text style={styles.mutedSmall}>{r.findings}</Text>}
                </View>
              ) : (
                <Text style={styles.mutedSmall}>
                  {r.status === 'Scheduled' ? `Scheduled for ${friendlyDate(r.date)} at ${r.time}.` : 'Scan in progress — report pending.'}
                </Text>
              )}
            </ClinicalCard>
          ))}
        </View>
      ) : (
        <InlineEmpty icon="scan-outline" text="No imaging on record." />
      )}

      <SectionHeader title="Bills & Receipts" meta={outstanding > 0 ? `${formatCurrency(outstanding)} due` : bills.length ? 'All paid' : undefined} />
      {bills.length ? (
        <ClinicalCard>
          {bills.map((inv, i) => (
            <PressableScale
              key={inv.id}
              style={[styles.listRow, i < bills.length - 1 && styles.rowDivider]}
              onPress={() => onOpenInvoice(inv.id)}
              accessibilityRole="button"
              accessibilityLabel={`${inv.title}, ${formatCurrency(inv.amount)}, ${inv.status}`}
            >
              <View style={[styles.rowIcon, { backgroundColor: inv.status === 'Paid' ? colors.successLight : colors.warningLight }]}>
                <Ionicons name="receipt-outline" size={18} color={inv.status === 'Paid' ? colors.success : colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {inv.title}
                </Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {inv.invoiceNo} • {inv.date}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={styles.amount}>{formatCurrency(inv.amount)}</Text>
                <Badge label={inv.status} variant={statusVariant(inv.status)} size="sm" />
              </View>
            </PressableScale>
          ))}
        </ClinicalCard>
      ) : (
        <InlineEmpty icon="receipt-outline" text="No bills yet." />
      )}

      <PressableScale style={styles.docs} onPress={onOpenDocuments} accessibilityRole="button" accessibilityLabel={`Documents, ${documents.length} files`}>
        <View style={[styles.rowIcon, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="folder-open-outline" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Documents</Text>
          <Text style={styles.rowSub}>
            {documents.length ? `${plural(documents.length, 'file')} • last added ${friendlyDate(documents[0].date)}` : 'No files yet — upload consent, ID or reports'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </PressableScale>
    </View>
  );
};

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  firstHeader: { marginTop: spacing.xs },
  inlineEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.base,
  },
  inlineEmptyText: { flex: 1, fontSize: typography.fontSizes.sm, color: colors.textSecondary },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    minHeight: 52,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: typography.fontSizes.sm + 1, fontWeight: typography.fontWeights.bold, color: colors.text },
  rowSub: { fontSize: typography.fontSizes.xs, color: colors.textSecondary, marginTop: 2 },
  amount: { fontSize: typography.fontSizes.sm + 1, fontWeight: typography.fontWeights.bold, color: colors.text },
  flagRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  flagText: { flex: 1, fontSize: typography.fontSizes.sm, color: colors.warningText, fontWeight: typography.fontWeights.medium, lineHeight: 19 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  bulletText: { flex: 1, fontSize: typography.fontSizes.sm + 1, color: colors.text, lineHeight: 20 },
  body: { fontSize: typography.fontSizes.sm, color: colors.text, lineHeight: 20 },
  bold: { fontWeight: typography.fontWeights.bold, color: colors.text },
  muted: { fontSize: typography.fontSizes.sm, color: colors.textMuted },
  mutedSmall: { fontSize: typography.fontSizes.xs + 1, color: colors.textSecondary, lineHeight: 18 },
  source: { fontSize: typography.fontSizes.xs, color: colors.purple, fontWeight: typography.fontWeights.semiBold },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  quoteText: { fontSize: typography.fontSizes.sm + 1, color: colors.text, lineHeight: 21, fontStyle: 'italic' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  condChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  condText: { fontSize: typography.fontSizes.sm - 1, color: colors.primaryDark, fontWeight: typography.fontWeights.semiBold },
  medRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  medText: { flex: 1, fontSize: typography.fontSizes.sm + 1, color: colors.text, fontWeight: typography.fontWeights.medium },
  skeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.base,
  },
  docs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
  },
});
