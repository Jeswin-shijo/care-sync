import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { LabSample, PatientDocument } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import { parameterFlag, referenceText } from '../../logic/clinical';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { formatDisplayDate } from '../../utils/dates';
import { exportDocument, ExportAction } from '../../utils/pdfGenerator';
import { BottomSheet } from '../common/BottomSheet';
import { Badge, statusVariant } from '../common/Badge';
import { Button } from '../common/Button';
import { buildDocumentSpec, DOC_TYPE_META, exportFileName, flaggedValue, labResultsForDocument, toHospitalHeader } from './documents';
import { ButtonRow, InfoRow } from './OpsUI';

interface Props {
  visible: boolean;
  doc: PatientDocument | null;
  onClose: () => void;
}

const LabResultBlock: React.FC<{ sample: LabSample }> = ({ sample }) => (
  <View style={styles.labBlock}>
    <View style={styles.labHead}>
      <Text style={styles.labTest} numberOfLines={2}>
        {sample.testName}
      </Text>
      <Badge label={sample.status} variant={statusVariant(sample.status)} size="sm" />
    </View>
    <Text style={styles.labDate}>
      {sample.date ? formatDisplayDate(sample.date) : sample.collectedAt}
      {sample.orderedBy ? ` • ${sample.orderedBy}` : ''}
    </Text>
    {(sample.parameters ?? []).map((p) => {
      const flag = parameterFlag(p);
      return (
        <View key={p.name} style={styles.paramRow}>
          <Text style={styles.paramName} numberOfLines={1}>
            {p.name}
          </Text>
          <Text style={[styles.paramValue, flag && styles.paramFlag]}>
            {flaggedValue(p).replace(' (High)', ' ↑').replace(' (Low)', ' ↓')}
          </Text>
          <Text style={styles.paramRef} numberOfLines={1}>
            {referenceText(p)}
          </Text>
        </View>
      );
    })}
    {!!sample.flag && (
      <View style={styles.labFlag}>
        <Ionicons name="alert-circle" size={13} color={colors.danger} />
        <Text style={styles.labFlagText}>{sample.flag}</Text>
      </View>
    )}
  </View>
);

export const DocumentPreviewSheet: React.FC<Props> = ({ visible, doc, onClose }) => {
  const { getPatient, getDischargeSummary, getLabResults, hospitalProfile } = useApp();
  const [busy, setBusy] = useState<ExportAction | null>(null);

  if (!doc) return null;

  const patient = getPatient(doc.patientId);
  const meta = DOC_TYPE_META[doc.type];
  const summary = doc.type === 'Discharge' ? getDischargeSummary(doc.patientId) : null;
  const results = doc.type === 'Lab Report' ? labResultsForDocument(doc, getLabResults(doc.patientId)) : [];

  const runExport = async (action: 'share' | 'print') => {
    if (busy) return;
    setBusy(action);
    try {
      const spec = buildDocumentSpec({ doc, patient, summary, labResults: results, hospital: toHospitalHeader(hospitalProfile) });
      await exportDocument(spec, exportFileName(doc), action);
    } finally {
      setBusy(null);
    }
  };

  const go = (pathname: string, params: Record<string, string>) => {
    onClose();
    router.push({ pathname, params });
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={doc.title}
      subtitle={`${doc.type} • ${formatDisplayDate(doc.date)} • ${doc.size}`}
      maxHeight={0.9}
      footer={
        <ButtonRow>
          <Button
            title="Share"
            variant="outline"
            onPress={() => runExport('share')}
            loading={busy === 'share'}
            disabled={!!busy && busy !== 'share'}
            style={styles.flex}
            icon={<Ionicons name="share-social-outline" size={17} color={colors.primary} />}
          />
          <Button
            title="Print"
            onPress={() => runExport('print')}
            loading={busy === 'print'}
            disabled={!!busy && busy !== 'print'}
            style={styles.flex}
            icon={<Ionicons name="print-outline" size={17} color="#FFFFFF" />}
          />
        </ButtonRow>
      }
    >
      <View style={styles.paper}>
        <View style={styles.paperHead}>
          <View style={[styles.paperIcon, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={18} color={meta.color} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.paperHospital} numberOfLines={1}>
              {hospitalProfile.name}
            </Text>
            <Text style={styles.paperType}>{doc.type === 'Discharge' ? 'Discharge Summary' : doc.type}</Text>
          </View>
          {summary?.status && <Badge label={summary.status} variant={statusVariant(summary.status)} size="sm" />}
        </View>

        {doc.type === 'Discharge' ? (
          summary ? (
            <View style={styles.paperBody}>
              <Text style={styles.label}>Diagnosis</Text>
              <Text style={styles.value}>{summary.diagnosis}</Text>
              <View style={styles.twoCol}>
                <View style={styles.flex}>
                  <Text style={styles.label}>Admitted</Text>
                  <Text style={styles.value}>{summary.admissionDate}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.label}>Discharged</Text>
                  <Text style={styles.value}>{summary.dischargeDate}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.label}>Stay</Text>
                  <Text style={styles.value}>{summary.stayDuration}</Text>
                </View>
              </View>
              <Text style={styles.label}>Consultant</Text>
              <Text style={styles.value}>
                {summary.doctorName} • {summary.department} • {summary.room}
              </Text>
              <Text style={styles.label}>Treatment given</Text>
              <Text style={styles.value}>{summary.treatmentGiven}</Text>
              {summary.prescriptions.length > 0 && (
                <>
                  <Text style={styles.label}>Discharge medication</Text>
                  {summary.prescriptions.map((p) => (
                    <Text key={p.name} style={styles.bullet}>
                      • {p.name} — {p.dosage} ({p.duration})
                    </Text>
                  ))}
                </>
              )}
              {summary.advice.length > 0 && (
                <>
                  <Text style={styles.label}>Advice</Text>
                  {summary.advice.slice(0, 3).map((a) => (
                    <Text key={a} style={styles.bullet}>
                      • {a}
                    </Text>
                  ))}
                </>
              )}
            </View>
          ) : (
            <Text style={styles.missing}>No discharge summary is on file for this admission yet.</Text>
          )
        ) : doc.type === 'Lab Report' ? (
          results.length ? (
            <View style={styles.paperBody}>
              {results.map((r) => (
                <LabResultBlock key={r.id} sample={r} />
              ))}
            </View>
          ) : (
            <Text style={styles.missing}>No structured results are on file — the scanned report is the record of reference.</Text>
          )
        ) : (
          <View style={styles.scan}>
            <Ionicons name={meta.icon} size={30} color={meta.color} />
            <View style={styles.scanLines}>
              <View style={[styles.scanLine, { width: '80%' }]} />
              <View style={[styles.scanLine, { width: '95%' }]} />
              <View style={[styles.scanLine, { width: '60%' }]} />
            </View>
            <Text style={styles.scanText}>
              Scanned copy • {doc.size} • {meta.description}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.metaCard}>
        <InfoRow label="Patient" value={doc.patientName} icon="person-outline" />
        <InfoRow label="UHID" value={patient?.uhid ?? '—'} icon="finger-print-outline" />
        <InfoRow label="Uploaded by" value={doc.uploadedBy} icon="cloud-upload-outline" />
        <InfoRow label="Date" value={formatDisplayDate(doc.date)} icon="calendar-outline" />
        <InfoRow label="Reference" value={doc.id.toUpperCase()} icon="barcode-outline" last />
      </View>

      <View style={styles.links}>
        {!!patient && (
          <Button
            title="Patient record"
            variant="ghost"
            size="sm"
            onPress={() => go('/patient/[id]', { id: patient.id })}
            icon={<Ionicons name="person-circle-outline" size={16} color={colors.primary} />}
          />
        )}
        {doc.type === 'Discharge' && !!summary && (
          <Button
            title="Discharge summary"
            variant="ghost"
            size="sm"
            onPress={() => go('/discharge-summary', { patientId: doc.patientId })}
            icon={<Ionicons name="open-outline" size={16} color={colors.primary} />}
          />
        )}
        {doc.type === 'Lab Report' && (
          <Button
            title="Lab orders"
            variant="ghost"
            size="sm"
            onPress={() => go('/lab', { patientId: doc.patientId })}
            icon={<Ionicons name="open-outline" size={16} color={colors.primary} />}
          />
        )}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  paper: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  paperHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    borderStyle: 'dashed',
  },
  paperIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paperHospital: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paperType: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  paperBody: {
    paddingTop: spacing.sm,
  },
  label: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  value: {
    fontSize: typography.fontSizes.sm,
    color: colors.text,
    marginTop: 2,
    lineHeight: 19,
  },
  bullet: {
    fontSize: typography.fontSizes.sm,
    color: colors.text,
    marginTop: 3,
    lineHeight: 19,
  },
  twoCol: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  missing: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    paddingTop: spacing.md,
    lineHeight: 19,
  },
  labBlock: {
    paddingVertical: spacing.sm,
  },
  labHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  labTest: {
    flex: 1,
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  labDate: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 6,
  },
  paramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.sm,
  },
  paramName: {
    flex: 1.2,
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
  },
  paramValue: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
    textAlign: 'right',
  },
  paramFlag: {
    color: colors.danger,
    fontWeight: typography.fontWeights.bold,
  },
  paramRef: {
    flex: 0.9,
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    textAlign: 'right',
  },
  labFlag: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 6,
  },
  labFlagText: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 1,
    color: colors.danger,
    fontWeight: typography.fontWeights.medium,
  },
  scan: {
    alignItems: 'center',
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  scanLines: {
    width: '70%',
    gap: 6,
    alignItems: 'center',
  },
  scanLine: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  scanText: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  metaCard: {
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
});
