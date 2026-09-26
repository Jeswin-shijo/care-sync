import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { ClinicalNote } from '../../../data/mockData';
import { colors, radius, spacing, typography } from '../../../constants/theme';
import { BottomSheet } from '../../common/BottomSheet';
import { Button } from '../../common/Button';
import { Badge } from '../../common/Badge';

interface NoteApprovalSheetProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  saving: boolean;
  patientName: string;
  uhid: string;
  content: string;
  source: ClinicalNote['source'];
  approver: string;
}

/** Human-in-the-loop gate: the doctor sees the exact note and confirms review before it reaches the EMR. */
export const NoteApprovalSheet: React.FC<NoteApprovalSheetProps> = ({ visible, onClose, onConfirm, saving, patientName, uhid, content, source, approver }) => {
  const [reviewed, setReviewed] = useState(false);

  useEffect(() => {
    if (visible) setReviewed(false);
  }, [visible]);

  const aiAuthored = source !== 'Text';

  return (
    <BottomSheet
      visible={visible}
      onClose={saving ? () => {} : onClose}
      dismissible={!saving}
      title="Approve clinical note"
      subtitle={`${patientName} • ${uhid}`}
      footer={
        <View style={styles.footer}>
          <Button title="Back" variant="ghost" onPress={onClose} disabled={saving} style={{ flex: 0.8 }} />
          <Button
            title="Approve & Save"
            onPress={onConfirm}
            disabled={!reviewed}
            loading={saving}
            icon={<Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />}
            style={{ flex: 1.5 }}
          />
        </View>
      }
    >
      <View style={styles.metaRow}>
        <Badge label={source} variant={source === 'Text' ? 'default' : 'primary'} size="sm" />
        <Text style={styles.meta}>Saved as Approved • signed {approver} • audit logged</Text>
      </View>
      <View style={styles.preview}>
        <Text style={styles.previewText} selectable>
          {content}
        </Text>
      </View>
      <Pressable
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          setReviewed((v) => !v);
        }}
        style={[styles.check, reviewed && styles.checkOn]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: reviewed }}
      >
        <View style={[styles.box, reviewed && styles.boxOn]}>{reviewed && <Ionicons name="checkmark" size={15} color="#FFFFFF" />}</View>
        <Text style={styles.checkText}>
          {aiAuthored ? 'I have reviewed this AI-generated draft' : 'I confirm this note is accurate and complete'}
        </Text>
      </Pressable>
      {!reviewed && <Text style={styles.helper}>Tick the box to enable approval.</Text>}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  meta: {
    flex: 1,
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  preview: {
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  previewText: {
    fontSize: typography.fontSizes.sm,
    color: colors.text,
    lineHeight: 20,
  },
  check: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.base,
    padding: spacing.md,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  checkOn: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkText: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  helper: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
