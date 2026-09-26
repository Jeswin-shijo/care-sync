import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { patientSummaryLines } from '../../../logic/clinical';
import { colors, radius, spacing, typography } from '../../../constants/theme';
import { Badge } from '../../common/Badge';
import { Button } from '../../common/Button';
import { FadeInView, stagger } from '../../common/Motion';
import { formatClock, formatDayMonth, formatDisplayDate, relativeDayLabel } from '../../../utils/dates';
import { exportDocument } from '../../../utils/pdfGenerator';
import { CitationChips } from '../CitationChips';
import type { PatientContext } from '../copilotEngine';

const VISIT_VARIANT = { OPD: 'info', IPD: 'admitted', 'Follow Up': 'warning', Emergency: 'danger' } as const;

const visitDate = (iso: string) => {
  const rel = relativeDayLabel(iso);
  return rel === 'Today' || rel === 'Yesterday' ? rel : formatDisplayDate(iso);
};

interface SummaryPanelProps {
  ctx: PatientContext;
  doctorName: string;
  hospital: { name: string; address: string; phone: string; email?: string; gstin: string; regNo?: string };
}

/** "Summarize History": the patient's longitudinal summary + encounter timeline, all from their own records. */
export const SummaryPanel: React.FC<SummaryPanelProps> = ({ ctx, doctorName, hospital }) => {
  const { patient, profile, visits, labResults, vitals } = ctx;
  const lines = patientSummaryLines(patient, profile, visits, ctx.labOrders);
  const [openVisit, setOpenVisit] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const share = async () => {
    setSharing(true);
    await exportDocument(
      {
        title: 'AI Patient Summary',
        subtitle: 'MediOS AI draft — verify against the source record before clinical use',
        meta: [
          ['Patient', patient.name],
          ['UHID', patient.uhid],
          ['Age / Gender', `${patient.age} / ${patient.gender}`],
          ['Status', `${patient.status}${patient.room ? ` • ${patient.room}` : ''}`],
          ['Generated', `${formatDisplayDate(new Date())}, ${formatClock()}`],
        ],
        sections: [
          { heading: 'Longitudinal summary', rows: lines.map((l) => [l.label, l.text] as [string, string]) },
          ...(vitals
            ? [
                {
                  heading: 'Latest vitals',
                  rows: [
                    ['Recorded', `${formatDayMonth(vitals.date)}, ${vitals.time} by ${vitals.recordedBy}`],
                    ['BP / Pulse', `${vitals.bp} mmHg / ${vitals.pulse} bpm`],
                    ['SpO₂ / Temp', `${vitals.spo2}% / ${vitals.temp}°F`],
                  ] as Array<[string, string]>,
                },
              ]
            : []),
          ...(visits.length
            ? [
                {
                  heading: `Encounters (${visits.length})`,
                  table: {
                    columns: ['Date', 'Type', 'Doctor', 'Diagnosis'],
                    rows: visits.map((v) => [formatDisplayDate(v.date), v.type, v.doctorName, v.diagnosis]),
                  },
                },
              ]
            : []),
        ],
        signatory: doctorName,
        signatoryRole: 'Reviewing clinician',
        hospital,
      },
      `AI-Summary-${patient.uhid}.pdf`,
      'share'
    );
    setSharing(false);
  };

  return (
    <View>
      <View style={styles.lines}>
        {lines.map((l, i) => (
          <FadeInView key={l.label} delay={stagger(i, 40)} offset={6} style={styles.line}>
            <View style={styles.bullet} />
            <Text style={styles.lineText}>
              <Text style={styles.lineLabel}>{l.label}: </Text>
              {l.text}
            </Text>
          </FadeInView>
        ))}
      </View>

      <Text style={styles.section}>Encounter timeline</Text>
      {!visits.length && <Text style={styles.empty}>No previous encounters — this is the first visit at City Care.</Text>}
      {visits.map((v, i) => {
        const open = openVisit === v.id;
        return (
          <Pressable
            key={v.id}
            onPress={() => setOpenVisit(open ? null : v.id)}
            style={styles.visit}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            accessibilityLabel={`${v.type} on ${formatDayMonth(v.date)}: ${v.diagnosis}`}
          >
            <View style={styles.rail}>
              <View style={[styles.dot, i === 0 && { backgroundColor: colors.primary }]} />
              {i < visits.length - 1 && <View style={styles.railLine} />}
            </View>
            <View style={styles.visitBody}>
              <View style={styles.visitHead}>
                <Text style={styles.visitDate}>{visitDate(v.date)}</Text>
                <Badge label={v.type} variant={VISIT_VARIANT[v.type]} size="sm" />
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
              </View>
              <Text style={styles.visitDx}>{v.diagnosis}</Text>
              <Text style={styles.visitMeta} numberOfLines={1}>
                {v.department} • {v.doctorName}
              </Text>
              {open && (
                <View style={styles.visitDetail}>
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Symptoms: </Text>
                    {v.symptoms}
                  </Text>
                  {!!v.prescription.length && (
                    <Text style={styles.detailText}>
                      <Text style={styles.detailLabel}>Prescribed: </Text>
                      {v.prescription.map((p) => `${p.name} ${p.frequency} × ${p.duration}`).join('; ')}
                    </Text>
                  )}
                  {!!v.advice && (
                    <Text style={styles.detailText}>
                      <Text style={styles.detailLabel}>Advice: </Text>
                      {v.advice}
                    </Text>
                  )}
                  {!!v.followUpDate && (
                    <Text style={styles.detailText}>
                      <Text style={styles.detailLabel}>Follow-up: </Text>
                      {relativeDayLabel(v.followUpDate)}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </Pressable>
        );
      })}

      <CitationChips
        style={styles.sources}
        citations={[
          { label: `Synthesized across ${visits.length} encounter${visits.length === 1 ? '' : 's'}`, detail: `EMR • ${patient.uhid}` },
          { label: `LIS • ${labResults.length} result${labResults.length === 1 ? '' : 's'}`, detail: labResults.slice(0, 3).map((r) => r.sampleCode).join(', ') || undefined },
          ...(vitals ? [{ label: 'Nursing chart', detail: `${vitals.recordedBy} • ${vitals.time}` }] : []),
        ]}
      />

      <Button
        title="Share summary (PDF)"
        variant="outline"
        size="sm"
        onPress={share}
        loading={sharing}
        icon={<Ionicons name="share-outline" size={16} color={colors.primary} />}
        style={styles.shareBtn}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  lines: {
    gap: spacing.sm,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 7,
  },
  lineText: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  lineLabel: {
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  section: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  },
  empty: {
    fontSize: typography.fontSizes.sm,
    color: colors.textMuted,
  },
  visit: {
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 44,
  },
  rail: {
    width: 14,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.textMuted,
    marginTop: 4,
  },
  railLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.borderLight,
    marginTop: 2,
  },
  visitBody: {
    flex: 1,
    paddingBottom: spacing.md,
  },
  visitHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  visitDate: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  visitDx: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
    marginTop: 3,
    lineHeight: 18,
  },
  visitMeta: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  visitDetail: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.cardMuted,
    borderRadius: radius.sm,
    gap: 4,
  },
  detailText: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  detailLabel: {
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  sources: {
    marginTop: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.successLight,
  },
  shareBtn: {
    marginTop: spacing.md,
  },
});
