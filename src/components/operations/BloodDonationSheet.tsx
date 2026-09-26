import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../context/AppContext';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { BottomSheet } from '../common/BottomSheet';
import { Button } from '../common/Button';
import { BLOOD_GROUPS, BloodGroup } from './bloodBank';
import { ChoiceChips, Field, Notice, QtyStepper } from './OpsUI';
import { plural } from './utils';

interface Props {
  visible: boolean;
  onClose: () => void;
  initialGroup?: BloodGroup | null;
  onRecorded: (group: BloodGroup, units: number, newTotal: number) => void;
}

/** Records a donation — the bank logs it as whole blood until components are separated. */
export const BloodDonationSheet: React.FC<Props> = ({ visible, onClose, initialGroup, onRecorded }) => {
  const { bloodStock, recordBloodDonation } = useApp();
  const [group, setGroup] = useState<BloodGroup | null>(null);
  const [units, setUnits] = useState(1);
  const [showErrors, setShowErrors] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    if (visible && initialGroup) setGroup(initialGroup);
  }, [visible, initialGroup]);

  const current = group ? bloodStock.find((s) => s.group === group)?.wholeBlood ?? 0 : 0;

  const submit = () => {
    if (submitting.current) return;
    setShowErrors(true);
    if (!group) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    submitting.current = true;
    recordBloodDonation(group, units);
    const recordedGroup = group;
    const recordedUnits = units;
    setGroup(null);
    setUnits(1);
    setShowErrors(false);
    submitting.current = false;
    onRecorded(recordedGroup, recordedUnits, current + recordedUnits);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Record donation"
      subtitle="Adds screened units to whole blood stock"
      footer={
        <Button
          title={group ? `Record ${plural(units, 'unit')} ${group}` : 'Record donation'}
          onPress={submit}
          size="lg"
          fullWidth
          icon={<Ionicons name="water" size={16} color="#FFFFFF" />}
        />
      }
    >
      <Field label="Donor blood group" required error={showErrors && !group ? 'Choose the donor’s blood group' : null}>
        <ChoiceChips
          options={BLOOD_GROUPS.map((g) => ({ value: g, label: g, tone: colors.danger }))}
          value={group}
          onChange={setGroup}
        />
      </Field>

      <Field label="Units collected" required hint="1 unit ≈ 350–450 ml of whole blood">
        <QtyStepper value={units} onChange={setUnits} min={1} max={10} unit={units === 1 ? 'unit' : 'units'} />
      </Field>

      {!!group && (
        <View style={styles.preview}>
          <Text style={styles.previewLabel}>{group} whole blood</Text>
          <View style={styles.previewRow}>
            <Text style={styles.previewFrom}>{current}</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
            <Text style={styles.previewTo}>{current + units}</Text>
            <Text style={styles.previewUnits}>units after this donation</Text>
          </View>
        </View>
      )}

      <Notice
        tone="info"
        message="Record only units that passed TTI screening (HIV, HBV, HCV, syphilis, malaria). Component separation is logged by the lab."
      />
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  preview: {
    backgroundColor: colors.dangerLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  previewLabel: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.dangerText,
    fontWeight: typography.fontWeights.semiBold,
    marginBottom: 4,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewFrom: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
  previewTo: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.danger,
  },
  previewUnits: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
  },
});
