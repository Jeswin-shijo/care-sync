import React, { useEffect, useState } from 'react';
import { Dimensions, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PrescriptionReviewItem } from '../../data/mockData';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { BottomSheet } from '../common/BottomSheet';
import { Button } from '../common/Button';
import { Avatar } from '../common/Avatar';
import { useKeyboardHeight } from '../common/KeyboardAware';

const SCREEN_H = Dimensions.get('window').height;
const MIN_NOTE = 5;

const QUICK_NOTES = [
  'Please approve the suggested safer alternative.',
  'Please confirm the dose and frequency.',
  'Please review the documented allergy history.',
  'Item out of stock — please prescribe a substitute.',
];

/** Short, editable default note describing why the prescription is on hold. */
export const defaultClarificationNote = (rx: PrescriptionReviewItem) => {
  const clip = (s: string) => (s.length > 110 ? `${s.slice(0, 109).trimEnd()}…` : s);
  if (rx.allergyAlert) return `Allergy conflict: ${clip(rx.allergyAlert)} Please confirm or change the prescription.`;
  if (rx.interactionAlert) return `Interaction: ${clip(rx.interactionAlert)} Please confirm or approve an alternative.`;
  return 'Please review this prescription before it is dispensed.';
};

interface ClarificationSheetProps {
  visible: boolean;
  rx: PrescriptionReviewItem | null;
  /** Pre-filled note (defaults to one built from the alert). */
  initialNote?: string;
  onClose: () => void;
  onSubmit: (note: string) => void;
}

/** Puts a prescription on hold and sends the prescriber a note. */
export const ClarificationSheet: React.FC<ClarificationSheetProps> = ({ visible, rx, initialNote, onClose, onSubmit }) => {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!visible || !rx) return;
    setNote(initialNote ?? defaultClarificationNote(rx));
    setSubmitted(false);
    setSending(false);
  }, [visible, rx?.id, initialNote]);

  const ok = note.trim().length >= MIN_NOTE;

  const send = () => {
    if (!rx || sending) return;
    setSubmitted(true);
    if (!ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    Keyboard.dismiss();
    setSending(true);
    onSubmit(note.trim());
  };

  const maxHeight = keyboard ? Math.max(0.45, (SCREEN_H - keyboard - insets.top - 12) / SCREEN_H) : 0.85;

  return (
    <BottomSheet
      visible={visible}
      onClose={() => !sending && onClose()}
      title="Request doctor clarification"
      subtitle={rx ? `${rx.prescriptionCode} • ${rx.patientName}` : undefined}
      maxHeight={maxHeight}
      footer={
        <Button
          title={rx ? `Send to ${rx.doctorName}` : 'Send'}
          onPress={send}
          loading={sending}
          disabled={sending}
          fullWidth
          icon={<Ionicons name="send" size={16} color="#FFFFFF" />}
        />
      }
    >
      {rx && (
        <View style={styles.toRow}>
          <Avatar name={rx.doctorName} size={36} />
          <View style={styles.flex}>
            <Text style={styles.toLabel}>To prescriber</Text>
            <Text style={styles.toName}>{rx.doctorName}</Text>
          </View>
          <View style={styles.holdPill}>
            <Ionicons name="pause-circle-outline" size={14} color={colors.warningText} />
            <Text style={styles.holdText}>Moves to On hold</Text>
          </View>
        </View>
      )}
      <Text style={styles.label}>Message</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={280}
        textAlignVertical="top"
        placeholder="What should the doctor review?"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, submitted && !ok && styles.inputError]}
        accessibilityLabel="Message to the prescriber"
      />
      <Text style={[styles.helper, submitted && !ok && styles.helperError]}>
        {submitted && !ok ? 'Write a short message for the doctor' : `${note.trim().length}/280 • sent as a secure in-app message`}
      </Text>
      <View style={styles.quick}>
        {QUICK_NOTES.map((q) => (
          <TouchableOpacity key={q} style={styles.quickChip} onPress={() => setNote(q)} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel={`Use message: ${q}`}>
            <Text style={styles.quickText}>{q}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  toRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.cardMuted,
  },
  toLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  toName: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: 1,
  },
  holdPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.warningLight,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  holdText: {
    fontSize: 10.5,
    color: colors.warningText,
    fontWeight: typography.fontWeights.bold,
  },
  label: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  },
  input: {
    minHeight: 96,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: typography.fontSizes.sm + 1,
    color: colors.text,
    backgroundColor: '#FFFFFF',
    lineHeight: 20,
  },
  inputError: {
    borderColor: colors.danger,
  },
  helper: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 4,
  },
  helperError: {
    color: colors.danger,
    fontWeight: typography.fontWeights.medium,
  },
  quick: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.md,
  },
  quickChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: colors.background,
  },
  quickText: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
  },
});
