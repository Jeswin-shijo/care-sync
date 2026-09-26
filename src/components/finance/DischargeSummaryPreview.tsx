import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { DischargeSummary } from '../../data/mockData';
import type { HospitalProfile } from '../../logic/hospital';
import type { DocumentSpec } from '../../utils/pdfGenerator';
import { colors, typography } from '../../constants/theme';
import { formatCurrency } from '../../utils/formatters';
import { DashedRule, Paper, PaperHeader, PaperRow, PaperSection, PaperSignature, PaperTitle, Stamp } from './Paper';
import { hospitalHeader } from './invoiceUtils';

export const dischargeDocumentSpec = (s: DischargeSummary, hospital: HospitalProfile): DocumentSpec => ({
  title: 'Discharge Summary',
  subtitle: s.status === 'Draft' ? 'Draft — pending consultant approval' : undefined,
  meta: [
    ['Patient', s.patientName],
    ['UHID', s.uhid],
    ['Admission', s.admissionDate],
    ['Discharge', s.dischargeDate],
    ['Room', s.room],
    ['Length of stay', s.stayDuration],
    ['Consultant', `${s.doctorName} (${s.department})`],
  ],
  sections: [
    { heading: 'Diagnosis', paragraphs: [s.diagnosis] },
    { heading: 'Treatment given', paragraphs: [s.treatmentGiven] },
    { heading: 'Advice on discharge', bullets: s.advice },
    ...(s.prescriptions.length
      ? [{ heading: 'Discharge medication', table: { columns: ['Medicine', 'Dosage', 'Duration'], rows: s.prescriptions.map((p) => [p.name, p.dosage, p.duration]) } }]
      : []),
    {
      heading: 'Billing summary',
      rows: [
        ['Total bill', formatCurrency(s.totalAmount, { decimals: 2 })],
        ['Insurance approved', formatCurrency(s.insuranceApproved, { decimals: 2 })],
        ['Paid by patient', formatCurrency(s.patientPaid, { decimals: 2 })],
      ],
    },
  ],
  signatory: s.doctorName,
  signatoryRole: 'Treating Consultant',
  hospital: hospitalHeader(hospital),
});

/** On-screen discharge summary document (clinical summary + final bill totals). */
export const DischargeSummaryPreview: React.FC<{ summary: DischargeSummary; hospital: HospitalProfile; watermark?: string }> = ({
  summary: s,
  hospital,
  watermark,
}) => {
  const final = s.status !== 'Draft';
  return (
    <Paper watermark={watermark}>
      <PaperHeader hospital={hospital} />
      <DashedRule />
      <PaperTitle title="Discharge Summary" right={<Stamp label={final ? 'FINAL' : 'DRAFT'} color={final ? colors.success : colors.warning} style={styles.stamp} />} />
      <PaperRow label="Patient Name" value={s.patientName} bold />
      <PaperRow label="UHID" value={s.uhid} />
      <PaperRow label="Admission Date" value={s.admissionDate} />
      <PaperRow label="Discharge Date" value={s.dischargeDate} />
      <PaperRow label="Room" value={s.room} />
      <PaperRow label="Length of Stay" value={s.stayDuration} />
      <PaperRow label="Consultant" value={`${s.doctorName} (${s.department})`} />

      <PaperSection title="Diagnosis">
        <Text style={styles.paragraph}>{s.diagnosis}</Text>
      </PaperSection>
      <PaperSection title="Treatment Given">
        <Text style={styles.paragraph}>{s.treatmentGiven}</Text>
      </PaperSection>
      <PaperSection title="Advice">
        {s.advice.map((a, i) => (
          <View key={i} style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.paragraph}>{a}</Text>
          </View>
        ))}
      </PaperSection>
      {s.prescriptions.length > 0 && (
        <PaperSection title="Discharge Medication">
          {s.prescriptions.map((p, i) => (
            <View key={`${p.name}-${i}`} style={styles.rx}>
              <Text style={styles.rxName}>{p.name}</Text>
              <Text style={styles.rxMeta}>
                {p.dosage} • {p.duration}
              </Text>
            </View>
          ))}
        </PaperSection>
      )}
      <PaperSection title="Billing Summary">
        <PaperRow label="Total bill" value={formatCurrency(s.totalAmount)} bold />
        <PaperRow label="Insurance approved" value={formatCurrency(s.insuranceApproved)} valueStyle={{ color: colors.success }} />
        <PaperRow label="Paid by patient" value={formatCurrency(s.patientPaid)} />
      </PaperSection>

      <PaperSignature hospitalName={hospital.name} signatory={s.doctorName} role="Treating Consultant" />
    </Paper>
  );
};

const styles = StyleSheet.create({
  stamp: {
    transform: [{ rotate: '-10deg' }],
  },
  paragraph: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 1,
    color: colors.text,
    lineHeight: 18,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 1,
  },
  bullet: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.primary,
    lineHeight: 18,
  },
  rx: {
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rxName: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  rxMeta: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
});
