import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { BloodRequest } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { BottomSheet } from '../common/BottomSheet';
import { Button } from '../common/Button';
import { ButtonRow, ChoiceChips, Field, Input, Notice } from './OpsUI';
import { plural } from './utils';

export const REJECT_REASONS = [
  'Sample haemolysed',
  'Cross-match incompatible',
  'Sample / form label mismatch',
  'Duplicate request',
  'Not clinically indicated',
  'Stock unavailable — refer to partner bank',
];

interface Props {
  visible: boolean;
  request: BloodRequest | null;
  onClose: () => void;
  onRejected: (updated: BloodRequest) => void;
  /** The request was issued or closed elsewhere before the rejection landed. */
  onFailed: () => void;
}

/** Reason → confirm → reject. The confirm step lives in the sheet so no alert has to stack over it. */
export const RejectRequestSheet: React.FC<Props> = ({ visible, request, onClose, onRejected, onFailed }) => {
  const { rejectBloodRequest } = useApp();
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const submitting = useRef(false);

  // A different request starts a fresh form.
  useEffect(() => {
    setReason(null);
    setNote('');
    setConfirming(false);
    setShowErrors(false);
  }, [request?.id]);

  // Re-opening the same request returns to the reason step.
  useEffect(() => {
    if (visible) setConfirming(false);
  }, [visible]);

  if (!request) return null;

  const reasonText = [reason, note.trim()].filter(Boolean).join(' — ');

  const review = () => {
    setShowErrors(true);
    if (!reasonText) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    setConfirming(true);
  };

  const confirm = () => {
    if (submitting.current || !reasonText) return;
    submitting.current = true;
    const updated = rejectBloodRequest(request.id, reasonText);
    submitting.current = false;
    if (updated) onRejected(updated);
    else onFailed();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Reject blood request"
      subtitle={`${request.patientName} • ${plural(request.units, 'unit')} ${request.group} ${request.component}`}
      footer={
        confirming ? (
          <ButtonRow>
            <Button title="Back" variant="outline" onPress={() => setConfirming(false)} style={styles.sideBtn} />
            <Button
              title="Confirm reject"
              variant="danger"
              onPress={confirm}
              style={styles.flex}
              icon={<Ionicons name="close-circle" size={17} color="#FFFFFF" />}
            />
          </ButtonRow>
        ) : (
          <Button
            title="Reject request"
            variant="danger"
            onPress={review}
            size="lg"
            fullWidth
            icon={<Ionicons name="close-circle-outline" size={18} color="#FFFFFF" />}
          />
        )
      }
    >
      <View style={styles.summary}>
        <View style={styles.group}>
          <Text style={styles.groupText}>{request.group}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.summaryTitle} numberOfLines={1}>
            {plural(request.units, 'unit')} • {request.component}
            {request.priority === 'Emergency' ? ' • Emergency' : ''}
          </Text>
          <Text style={styles.summaryMeta} numberOfLines={1}>
            {request.requestedBy} • {request.requestedAt}
          </Text>
        </View>
      </View>

      {confirming ? (
        <Notice
          tone="warning"
          title="Confirm rejection"
          message={`${request.requestedBy} will be notified: “${reasonText}”. A rejected request can't be issued — the ward must raise a new one.`}
        />
      ) : (
        <>
          <Field label="Reason" required error={showErrors && !reasonText ? 'Choose a reason or write one below' : null}>
            <ChoiceChips
              options={REJECT_REASONS.map((r) => ({ value: r, label: r, tone: colors.danger }))}
              value={reason}
              onChange={(r) => setReason((prev) => (prev === r ? null : r))}
            />
          </Field>
          <Field label="Note for the ward" hint="Optional — e.g. repeat sample needed in EDTA + plain tube">
            <Input value={note} onChangeText={setNote} placeholder="Add details" icon="create-outline" maxLength={120} />
          </Field>
        </>
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  sideBtn: {
    minWidth: 96,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  group: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupText: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.danger,
  },
  summaryTitle: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  summaryMeta: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
