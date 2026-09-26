import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { PatientDocument } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import { ROLE_ACTOR } from '../../logic/hospital';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { formatClock, todayISO } from '../../utils/dates';
import { BottomSheet } from '../common/BottomSheet';
import { Button } from '../common/Button';
import { PatientPicker, PatientSelectorBar } from '../common/PatientPicker';
import { PressableScale, ProgressFill } from '../common/Motion';
import { DOC_TYPE_META, DOC_TYPES, DocType, estimateSize, TITLE_SUGGESTIONS } from './documents';
import { ChoiceChips, Field, Input } from './OpsUI';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Pre-selects the patient (e.g. when the vault is filtered to one patient). */
  initialPatientId?: string | null;
  onUploaded: (doc: PatientDocument) => void;
}

type Source = 'scan' | 'file';

interface Attachment {
  source: Source;
  name: string;
  size: string;
}

const UPLOAD_MS = 1000;

const fileNameFor = (source: Source, title: string, type: DocType | null) => {
  if (source === 'scan') {
    const stamp = `${todayISO().replace(/-/g, '')}_${formatClock().replace(/[^0-9]/g, '')}`;
    return `Scan_${stamp}.pdf`;
  }
  const base = (title.trim() || type || 'Document').replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '');
  return `${base || 'Document'}.pdf`;
};

export const UploadDocumentSheet: React.FC<Props> = ({ visible, onClose, initialPatientId, onUploaded }) => {
  const { getPatient, addDocument, activeRole, patientAppUser } = useApp();

  const [patientId, setPatientId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [type, setType] = useState<DocType | null>(null);
  const [title, setTitle] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [uploading, setUploading] = useState<Source | null>(null);
  const [progress, setProgress] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const submitting = useRef(false);

  useEffect(() => {
    if (visible && initialPatientId && !patientId) setPatientId(initialPatientId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialPatientId]);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    []
  );

  const patient = getPatient(patientId);
  const uploadedBy = activeRole === 'patient' ? patientAppUser?.name ?? ROLE_ACTOR.patient : ROLE_ACTOR[activeRole];

  const errors = {
    patient: !patient ? 'Select whose record this document belongs to' : null,
    type: !type ? 'Choose the document type' : null,
    title: title.trim().length < 3 ? 'Give the document a title (at least 3 characters)' : null,
    file: !attachment ? (uploading ? 'Wait for the upload to finish' : 'Scan or attach the document') : null,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const startUpload = (source: Source) => {
    if (uploading) return;
    Haptics.selectionAsync().catch(() => {});
    setAttachment(null);
    setUploading(source);
    setProgress(0);
    const started = Date.now();
    const chosenType = type;
    const chosenTitle = title;
    timer.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - started) / UPLOAD_MS);
      setProgress(p);
      if (p >= 1) {
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
        setUploading(null);
        setAttachment({ source, name: fileNameFor(source, chosenTitle, chosenType), size: estimateSize(chosenType) });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    }, 100);
  };

  const reset = () => {
    setPatientId(null);
    setType(null);
    setTitle('');
    setAttachment(null);
    setProgress(0);
    setShowErrors(false);
  };

  const submit = () => {
    if (submitting.current) return;
    setShowErrors(true);
    if (hasErrors || !patient || !type || !attachment) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    submitting.current = true;
    const doc = addDocument({ patientId: patient.id, title: title.trim(), type, size: attachment.size, uploadedBy });
    reset();
    submitting.current = false;
    onUploaded(doc);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Upload document"
      subtitle="Scan or attach to the patient's record"
      maxHeight={0.92}
      footer={
        <Button
          title={uploading ? 'Uploading…' : 'Save to record'}
          onPress={submit}
          disabled={!!uploading}
          size="lg"
          fullWidth
          icon={<Ionicons name="cloud-done-outline" size={18} color="#FFFFFF" />}
        />
      }
    >
      <Field label="Patient" required error={showErrors ? errors.patient : null}>
        <PatientSelectorBar patient={patient} onPress={() => setPickerOpen(true)} label="File to" />
      </Field>

      <Field label="Document type" required error={showErrors ? errors.type : null}>
        <ChoiceChips
          options={DOC_TYPES.map((t) => ({ value: t, label: t, icon: DOC_TYPE_META[t].icon, tone: DOC_TYPE_META[t].color }))}
          value={type}
          onChange={setType}
        />
      </Field>

      <Field label="Title" required error={showErrors ? errors.title : null}>
        <Input
          value={title}
          onChangeText={setTitle}
          placeholder={type ? `e.g. ${TITLE_SUGGESTIONS[type][0]}` : 'e.g. Aadhaar Card'}
          icon="document-text-outline"
          invalid={showErrors && !!errors.title}
          autoCapitalize="words"
          maxLength={80}
        />
        {!!type && (
          <ChoiceChips
            scroll
            bleed={spacing.lg}
            style={styles.suggestions}
            options={TITLE_SUGGESTIONS[type].map((s) => ({ value: s, label: s }))}
            value={TITLE_SUGGESTIONS[type].includes(title.trim()) ? title.trim() : null}
            onChange={setTitle}
          />
        )}
      </Field>

      <Field label="File" required error={showErrors ? errors.file : null}>
        {attachment ? (
          <View style={styles.file}>
            <View style={styles.fileIcon}>
              <Ionicons name={attachment.source === 'scan' ? 'camera' : 'document-attach'} size={18} color={colors.success} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.fileName} numberOfLines={1}>
                {attachment.name}
              </Text>
              <Text style={styles.fileMeta}>
                ≈ {attachment.size} • {attachment.source === 'scan' ? 'Camera scan' : 'PDF attachment'} • uploaded
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setAttachment(null)}
              hitSlop={10}
              style={styles.replace}
              accessibilityRole="button"
              accessibilityLabel="Remove attached file"
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : uploading ? (
          <View style={styles.uploading}>
            <View style={styles.uploadingTop}>
              <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
              <Text style={styles.uploadingText}>{uploading === 'scan' ? 'Processing scan…' : 'Uploading file…'}</Text>
              <Text style={styles.uploadingPct}>{Math.round(progress * 100)}%</Text>
            </View>
            <ProgressFill progress={progress} height={6} />
          </View>
        ) : (
          <View style={styles.sources}>
            <PressableScale
              onPress={() => startUpload('scan')}
              haptic
              style={styles.source}
              accessibilityRole="button"
              accessibilityLabel="Scan document with camera"
            >
              <Ionicons name="camera-outline" size={22} color={colors.primary} />
              <Text style={styles.sourceTitle}>Scan</Text>
              <Text style={styles.sourceSub}>Use camera</Text>
            </PressableScale>
            <PressableScale
              onPress={() => startUpload('file')}
              haptic
              style={styles.source}
              accessibilityRole="button"
              accessibilityLabel="Attach a PDF or image file"
            >
              <Ionicons name="attach-outline" size={22} color={colors.primary} />
              <Text style={styles.sourceTitle}>Attach</Text>
              <Text style={styles.sourceSub}>PDF or image</Text>
            </PressableScale>
          </View>
        )}
      </Field>

      <Text style={styles.by}>Uploaded by {uploadedBy} • encrypted at rest in the document vault</Text>

      <PatientPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(p) => setPatientId(p.id)}
        selectedId={patientId}
        title="File document to…"
      />
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  suggestions: {
    paddingTop: spacing.sm,
  },
  sources: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  source: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.base,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary + '66',
    backgroundColor: colors.primaryLight,
    gap: 2,
  },
  sourceTitle: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
    marginTop: 4,
  },
  sourceSub: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  uploading: {
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    gap: spacing.sm,
  },
  uploadingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  uploadingText: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.primaryDark,
  },
  uploadingPct: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  file: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.success + '40',
  },
  fileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  fileMeta: {
    fontSize: typography.fontSizes.xs,
    color: colors.successText,
    marginTop: 2,
  },
  replace: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  by: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
