import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DischargeSummary, Invoice, Patient, PatientDocument } from '../../data/mockData';
import type { HospitalProfile } from '../../logic/hospital';
import type { DocumentSpec } from '../../utils/pdfGenerator';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { formatCurrency } from '../../utils/formatters';
import { formatDisplayDate } from '../../utils/dates';
import { DashedRule, Paper, PaperHeader, PaperRow, PaperSection, PaperSignature, PaperTitle } from './Paper';
import { hospitalHeader, insurerName, receiptBreakdown, splitDoctorName } from './invoiceUtils';

export interface ClaimData {
  invoice: Invoice;
  patient?: Patient;
  summary?: DischargeSummary | null;
  documents: PatientDocument[];
}

interface ClaimFacts {
  claimRef: string;
  insurer: string;
  policyStatus: string;
  admission: string;
  discharge: string;
  room: string;
  doctor: string;
  department: string;
  diagnosis: string;
  gross: number;
  approved: number;
  patientShare: number;
  settlement: string;
  enclosures: Array<{ label: string; ok: boolean }>;
}

/** Everything the claim form shows, derived once for both the preview and the PDF. */
export const claimFacts = ({ invoice, patient, summary, documents }: ClaimData): ClaimFacts => {
  const b = receiptBreakdown(invoice);
  const doc = splitDoctorName(invoice.doctorName);
  const own = documents.filter((d) => d.patientId === invoice.patientId);
  const hasDoc = (type: PatientDocument['type']) => own.some((d) => d.type === type);
  return {
    claimRef: `CLM-${invoice.invoiceNo}`,
    insurer: insurerName(patient?.insurance),
    policyStatus: /\(active\)/i.test(patient?.insurance ?? '') ? 'Active' : patient ? 'To be verified' : '—',
    admission: summary?.admissionDate ?? (patient?.admittedOn ? formatDisplayDate(patient.admittedOn) : '—'),
    discharge: summary?.dischargeDate ?? (patient?.dischargedOn ? formatDisplayDate(patient.dischargedOn) : patient?.status === 'Admitted' ? 'In-patient' : '—'),
    room: summary?.room ?? patient?.room ?? '—',
    doctor: summary?.doctorName ?? doc?.name ?? patient?.attendingDoctor ?? '—',
    department: summary?.department ?? doc?.department ?? patient?.department ?? '—',
    diagnosis: summary?.diagnosis ?? 'As per discharge summary',
    gross: b.gross,
    approved: b.insurance,
    patientShare: invoice.amount,
    settlement: invoice.status === 'Paid' ? 'Patient share paid' : 'Patient share pending',
    enclosures: [
      { label: 'Discharge summary', ok: !!summary || hasDoc('Discharge') },
      { label: 'Final bill with itemised charges', ok: true },
      { label: 'Pre-authorisation / insurance card', ok: hasDoc('Insurance') || /\(active\)/i.test(patient?.insurance ?? '') },
      { label: 'Investigation reports', ok: hasDoc('Lab Report') || hasDoc('Imaging') || b.charges.some((c) => /lab|investigation|radiology|scan/i.test(c.description)) },
      { label: 'Patient photo ID proof', ok: hasDoc('ID Proof') },
    ],
  };
};

export const claimDocumentSpec = (data: ClaimData, hospital: HospitalProfile): DocumentSpec => {
  const f = claimFacts(data);
  const { invoice, patient } = data;
  const b = receiptBreakdown(invoice);
  return {
    title: 'Insurance Claim Document',
    subtitle: 'Cashless hospitalisation claim — Part B (to be filled by the hospital)',
    meta: [
      ['Claim reference', f.claimRef],
      ['Insurer / TPA', f.insurer],
      ['Policy status', f.policyStatus],
      ['Bill number', invoice.invoiceNo],
    ],
    sections: [
      {
        heading: 'Patient',
        rows: [
          ['Name', invoice.patientName],
          ['UHID', invoice.uhid],
          ['Age / Gender', patient ? `${patient.age} / ${patient.gender}` : '—'],
          ['Contact', patient?.phone ?? '—'],
        ],
      },
      {
        heading: 'Hospitalisation',
        rows: [
          ['Admission', f.admission],
          ['Discharge', f.discharge],
          ['Room / Ward', f.room],
          ['Treating doctor', f.doctor],
          ['Department', f.department],
          ['Diagnosis', f.diagnosis],
        ],
      },
      {
        heading: 'Claim summary',
        table: {
          columns: ['Particulars', 'Qty', 'Amount'],
          rows: [
            ...b.charges.map((c) => [c.description, String(c.qty), formatCurrency(c.amount, { decimals: 2 })]),
            ['Gross charges', '', formatCurrency(f.gross, { decimals: 2 })],
            ['Claimed / approved by insurer', '', formatCurrency(f.approved, { decimals: 2 })],
            ['Patient share', '', formatCurrency(f.patientShare, { decimals: 2 })],
          ],
          alignRight: [1, 2],
        },
      },
      { heading: 'Enclosures', bullets: f.enclosures.map((e) => `${e.ok ? '[x]' : '[ ]'} ${e.label}`) },
      {
        heading: 'Declaration',
        paragraphs: [
          'We certify that the patient named above was treated at this hospital and that the charges listed are true and as per the hospital tariff.',
          `Settlement status: ${f.settlement}.`,
        ],
      },
    ],
    signatory: 'TPA Desk',
    signatoryRole: 'Hospital Authority',
    hospital: hospitalHeader(hospital),
  };
};

/** On-screen claim form preview (Insurance Claim Document template). */
export const ClaimFormPreview: React.FC<{ data: ClaimData; hospital: HospitalProfile; watermark?: string }> = ({ data, hospital, watermark }) => {
  const f = claimFacts(data);
  const { invoice, patient } = data;
  const b = receiptBreakdown(invoice);
  return (
    <Paper watermark={watermark}>
      <PaperHeader hospital={hospital} />
      <DashedRule />
      <PaperTitle title="Insurance Claim Document" subtitle="Cashless hospitalisation claim — Part B (Hospital)" />
      <PaperRow label="Claim Ref" value={f.claimRef} bold />
      <PaperRow label="Insurer / TPA" value={f.insurer} />
      <PaperRow label="Policy status" value={f.policyStatus} valueStyle={f.policyStatus === 'Active' ? { color: colors.success } : undefined} />
      <PaperRow label="Bill No" value={invoice.invoiceNo} />

      <PaperSection title="Patient">
        <PaperRow label="Name" value={invoice.patientName} bold />
        <PaperRow label="UHID" value={invoice.uhid} />
        <PaperRow label="Age / Gender" value={patient ? `${patient.age} / ${patient.gender}` : '—'} />
        <PaperRow label="Contact" value={patient?.phone ?? '—'} />
      </PaperSection>

      <PaperSection title="Hospitalisation">
        <PaperRow label="Admission" value={f.admission} />
        <PaperRow label="Discharge" value={f.discharge} />
        <PaperRow label="Room / Ward" value={f.room} />
        <PaperRow label="Treating doctor" value={f.doctor} />
        <PaperRow label="Department" value={f.department} />
        <PaperRow label="Diagnosis" value={f.diagnosis} />
      </PaperSection>

      <PaperSection title="Claim summary">
        {b.charges.map((c, i) => (
          <View key={`${c.description}-${i}`} style={styles.line}>
            <Text style={styles.lineText}>{c.description}</Text>
            <Text style={styles.lineAmount}>{formatCurrency(c.amount)}</Text>
          </View>
        ))}
        <View style={[styles.line, styles.totalLine]}>
          <Text style={styles.totalText}>Gross charges</Text>
          <Text style={styles.totalText}>{formatCurrency(f.gross)}</Text>
        </View>
        <View style={styles.line}>
          <Text style={[styles.lineText, { color: colors.success }]}>Claimed / approved by insurer</Text>
          <Text style={[styles.lineAmount, { color: colors.success }]}>{formatCurrency(f.approved)}</Text>
        </View>
        <View style={styles.line}>
          <Text style={styles.lineText}>Patient share ({f.settlement.toLowerCase()})</Text>
          <Text style={styles.lineAmount}>{formatCurrency(f.patientShare)}</Text>
        </View>
      </PaperSection>

      <PaperSection title="Enclosures">
        {f.enclosures.map((e) => (
          <View key={e.label} style={styles.enclosure}>
            <Ionicons name={e.ok ? 'checkbox' : 'square-outline'} size={16} color={e.ok ? colors.success : colors.textMuted} />
            <Text style={[styles.enclosureText, !e.ok && { color: colors.textSecondary }]}>{e.label}</Text>
            {!e.ok && <Text style={styles.missing}>Missing</Text>}
          </View>
        ))}
      </PaperSection>

      <View style={styles.declaration}>
        <Text style={styles.declarationText}>
          We certify that the patient named above was treated at this hospital and that the charges listed are true and as per the hospital tariff.
        </Text>
      </View>

      <PaperSignature hospitalName={hospital.name} signatory="TPA Desk" role="Hospital Authority" footer="Submit with originals to the insurer / TPA within 15 days of discharge." />
    </Paper>
  );
};

const styles = StyleSheet.create({
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: 4,
  },
  lineText: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 1,
    color: colors.text,
  },
  lineAmount: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.text,
    fontWeight: typography.fontWeights.semiBold,
  },
  totalLine: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: 2,
    paddingTop: 6,
  },
  totalText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  enclosure: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 3,
  },
  enclosureText: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 1,
    color: colors.text,
  },
  missing: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.warningText,
    backgroundColor: colors.warningLight,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  declaration: {
    marginTop: spacing.md,
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  declarationText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
