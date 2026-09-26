import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { formatCurrency } from '../../utils/formatters';
import { BottomSheet } from '../common/BottomSheet';
import { Button } from '../common/Button';
import type { IndentTarget } from './inventory';
import { Field, InfoRow, QtyStepper } from './OpsUI';

interface Props {
  visible: boolean;
  target: IndentTarget | null;
  onClose: () => void;
  /** Parent raises the indent (store vs pharmacy) and confirms. */
  onSubmit: (target: IndentTarget, qty: number) => void;
}

const n = (v: number) => v.toLocaleString('en-IN');

/** Purchase indent for a store supply or a pharmacy medicine. */
export const IndentSheet: React.FC<Props> = ({ visible, target, onClose, onSubmit }) => {
  const [qty, setQty] = useState(1);
  const submitting = useRef(false);

  useEffect(() => {
    if (visible && target) setQty(target.suggested);
    // Re-seed only when a different item is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, target?.kind, target?.id]);

  if (!target) return null;

  const projected = target.stock + target.onOrder + qty;
  const clears = projected > target.reorderLevel;

  const submit = () => {
    if (submitting.current || qty < 1) return;
    submitting.current = true;
    onSubmit(target, qty);
    submitting.current = false;
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={target.kind === 'medicine' ? 'Raise pharmacy indent' : 'Raise store indent'}
      subtitle={target.name}
      footer={
        <Button
          title={`Raise indent • ${n(qty)} ${target.unit}`}
          onPress={submit}
          size="lg"
          fullWidth
          icon={<Ionicons name="cart" size={17} color="#FFFFFF" />}
        />
      }
    >
      <View style={styles.summary}>
        <InfoRow label="Item" value={target.detail} icon="pricetag-outline" />
        <InfoRow label="In stock" value={`${n(target.stock)} ${target.unit}`} icon="cube-outline" />
        <InfoRow label={target.reorderLabel} value={`${n(target.reorderLevel)} ${target.unit}`} icon="alert-circle-outline" />
        {target.onOrder > 0 && <InfoRow label="Already on order" value={`${n(target.onOrder)} ${target.unit}`} icon="time-outline" />}
        {!!target.supplier && <InfoRow label="Supplier" value={target.supplier} icon="business-outline" />}
        {!!target.lastRestocked && <InfoRow label="Last restocked" value={target.lastRestocked} icon="calendar-outline" />}
        <InfoRow
          label="Indent value"
          value={typeof target.unitPrice === 'number' ? `≈ ${formatCurrency(target.unitPrice * qty)}` : 'As per rate contract'}
          icon="card-outline"
          last
        />
      </View>

      <Field
        label="Indent quantity"
        required
        hint={`Suggested ${n(target.suggested)} ${target.unit} — brings stock to twice the ${target.reorderLabel.toLowerCase()}`}
      >
        <QtyStepper value={qty} onChange={setQty} min={1} max={99999} step={target.step} unit={target.unit} />
      </Field>

      <View style={[styles.projection, { backgroundColor: clears ? colors.successLight : colors.warningLight }]}>
        <Ionicons name={clears ? 'checkmark-circle' : 'warning'} size={18} color={clears ? colors.success : colors.warning} />
        <Text style={[styles.projectionText, { color: clears ? colors.successText : colors.warningText }]}>
          After delivery: {n(projected)} {target.unit}
          {clears ? ` — above the ${target.reorderLabel.toLowerCase()}` : ` — still at or below the ${target.reorderLabel.toLowerCase()}`}
        </Text>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  summary: {
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.base,
  },
  projection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  projectionText: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
  },
});
