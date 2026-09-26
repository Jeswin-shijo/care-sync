import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Medicine } from '../../data/mockData';
import { quantityFor } from '../../logic/hospital';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { formatCurrency } from '../../utils/formatters';
import { BottomSheet } from '../common/BottomSheet';
import { SearchBar } from '../common/SearchBar';
import { Button } from '../common/Button';
import { ChoiceChips } from './ChoiceChips';
import { FieldInput, FormField } from './FormField';
import {
  defaultsFor,
  doseOptionsFor,
  DURATION_PRESETS,
  durationDays,
  durationLabel,
  FREQUENCIES,
  INSTRUCTION_PRESETS,
  newRxKey,
  RxLine,
  stockStateFor,
} from './rx';

interface MedicinePickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (line: RxLine) => void;
  medicines: Medicine[];
  /** Line being edited (opens straight on the dosing step). */
  initial?: RxLine | null;
  /** Pre-filled search, e.g. a safer alternative. */
  initialQuery?: string;
}

type Phase = 'search' | 'details';

const STOCK_COLORS = {
  ok: colors.success,
  low: colors.warning,
  soon: colors.warning,
  out: colors.danger,
  expired: colors.danger,
} as const;

/** Search the pharmacy inventory (or type any drug) and set dose, frequency, duration and instructions. */
export const MedicinePickerSheet: React.FC<MedicinePickerSheetProps> = ({
  visible,
  onClose,
  onSubmit,
  medicines,
  initial,
  initialQuery,
}) => {
  const [phase, setPhase] = useState<Phase>('search');
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [medicineId, setMedicineId] = useState<string | undefined>();
  const [dose, setDose] = useState('');
  const [frequency, setFrequency] = useState<string>('BD');
  const [days, setDays] = useState(5);
  const [instruction, setInstruction] = useState<string | null>('After food');
  const [customInstruction, setCustomInstruction] = useState('');

  // Reset every time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    if (initial) {
      setPhase('details');
      setName(initial.name);
      setMedicineId(initial.medicineId);
      setDose(initial.dose);
      setFrequency(initial.frequency.split(' ')[0] || 'BD');
      setDays(durationDays(initial.duration));
      const preset = INSTRUCTION_PRESETS.find((p) => p === initial.instructions);
      setInstruction(preset ?? null);
      setCustomInstruction(preset ? '' : initial.instructions ?? '');
      setQuery('');
    } else {
      setPhase('search');
      setQuery(initialQuery ?? '');
      setName('');
      setMedicineId(undefined);
      setDose('');
      setCustomInstruction('');
    }
  }, [visible]);

  const medicine = medicineId ? medicines.find((m) => m.id === medicineId) : undefined;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? medicines.filter((m) => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q))
      : medicines;
    return [...list].sort((a, b) => {
      const aw = q && a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bw = q && b.name.toLowerCase().startsWith(q) ? 0 : 1;
      return aw - bw || a.name.localeCompare(b.name);
    });
  }, [medicines, query]);

  const exact = medicines.some((m) => m.name.toLowerCase() === query.trim().toLowerCase());

  const choose = (m: Medicine | null, freeText?: string) => {
    const d = defaultsFor(m ?? undefined);
    setName(m ? m.name : (freeText ?? '').trim());
    setMedicineId(m?.id);
    setDose(d.dose);
    setFrequency(d.frequency);
    setDays(durationDays(d.duration));
    const preset = INSTRUCTION_PRESETS.find((p) => p === d.instructions);
    setInstruction(preset ?? null);
    setCustomInstruction(preset ? '' : d.instructions ?? '');
    setPhase('details');
  };

  const instructions = customInstruction.trim() || instruction || undefined;
  const qty = quantityFor({ frequency, duration: durationLabel(days) });
  const unit = /cap/i.test(dose) ? 'capsules' : /tab/i.test(dose) ? 'tablets' : 'units';
  const canSave = !!name.trim() && !!dose.trim();

  const submit = () => {
    if (!canSave) return;
    onSubmit({
      key: initial?.key ?? newRxKey(),
      name: name.trim(),
      medicineId,
      dose: dose.trim(),
      frequency,
      duration: durationLabel(days),
      instructions,
    });
    onClose();
  };

  const stock = medicine ? stockStateFor(medicine) : null;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={phase === 'search' ? 'Add Medicine' : initial ? 'Edit Medicine' : 'Dosage & Instructions'}
      subtitle={phase === 'search' ? 'Search pharmacy inventory or type any drug' : name}
      maxHeight={0.9}
      footer={
        phase === 'details' ? (
          <Button
            title={initial ? 'Update Medicine' : 'Add to Prescription'}
            onPress={submit}
            disabled={!canSave}
            fullWidth
            size="lg"
            icon={<Ionicons name={initial ? 'checkmark' : 'add'} size={18} color="#FFFFFF" />}
          />
        ) : undefined
      }
    >
      {phase === 'search' ? (
        <View>
          <SearchBar value={query} onChangeText={setQuery} placeholder="e.g. Paracetamol, antibiotic…" />
          {!!query.trim() && !exact && (
            <TouchableOpacity style={styles.freeText} onPress={() => choose(null, query)} accessibilityRole="button">
              <View style={[styles.medIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="create-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.medName} numberOfLines={1}>
                  Use “{query.trim()}”
                </Text>
                <Text style={styles.medMeta}>Not in inventory — pharmacy will source it</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          <View style={{ marginTop: spacing.sm }}>
            {results.map((m) => {
              const s = stockStateFor(m);
              return (
                <TouchableOpacity
                  key={m.id}
                  style={styles.medRow}
                  onPress={() => choose(m)}
                  accessibilityRole="button"
                  accessibilityLabel={`${m.name}, ${m.category}, ${s.label}`}
                >
                  <View style={styles.medIcon}>
                    <Ionicons name="medical-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medName} numberOfLines={1}>
                      {m.name}
                    </Text>
                    <Text style={styles.medMeta} numberOfLines={1}>
                      {m.category} • {m.dosageForm} • {formatCurrency(m.price, { decimals: 2 })}
                    </Text>
                  </View>
                  <View style={[styles.stockPill, { borderColor: STOCK_COLORS[s.tone] + '66' }]}>
                    <View style={[styles.stockDot, { backgroundColor: STOCK_COLORS[s.tone] }]} />
                    <Text style={[styles.stockText, { color: STOCK_COLORS[s.tone] }]} numberOfLines={1}>
                      {s.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            {!results.length && !query.trim() && <Text style={styles.empty}>Inventory is empty.</Text>}
          </View>
        </View>
      ) : (
        <View>
          <View style={styles.selected}>
            <View style={styles.medIcon}>
              <Ionicons name="medical" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.medName} numberOfLines={2}>
                {name}
              </Text>
              <Text style={styles.medMeta}>
                {medicine ? `${medicine.category} • ${medicine.dosageForm}` : 'Free-text drug (not in inventory)'}
              </Text>
              {stock && stock.tone !== 'ok' && (
                <Text style={[styles.stockWarn, { color: STOCK_COLORS[stock.tone] }]}>{stock.label} — pharmacy will be alerted</Text>
              )}
            </View>
            {!initial && (
              <TouchableOpacity onPress={() => setPhase('search')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Change medicine">
                <Text style={styles.change}>Change</Text>
              </TouchableOpacity>
            )}
          </View>

          <FormField label="Dose" required error={!dose.trim() ? 'Enter a dose, e.g. 1 Tab' : null}>
            <FieldInput value={dose} onChangeText={setDose} placeholder="e.g. 1 Tab" invalid={!dose.trim()} />
            <ChoiceChips
              style={styles.chipsBelow}
              size="sm"
              options={doseOptionsFor(medicine?.dosageForm).map((d) => ({ value: d, label: d }))}
              value={dose}
              onChange={setDose}
            />
          </FormField>

          <FormField label="Frequency" required hint={FREQUENCIES.find((f) => f.code === frequency)?.hint}>
            <ChoiceChips
              options={FREQUENCIES.map((f) => ({ value: f.code, label: f.code, accessibilityHint: f.hint }))}
              value={frequency}
              onChange={setFrequency}
            />
          </FormField>

          <FormField
            label="Duration"
            required
            hint={`Pharmacy dispenses ≈ ${qty} ${unit}`}
            labelRight={
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setDays((d) => Math.max(1, d - 1))}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="One day less"
                >
                  <Ionicons name="remove" size={16} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.stepValue}>{durationLabel(days)}</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setDays((d) => Math.min(90, d + 1))}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="One day more"
                >
                  <Ionicons name="add" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            }
          >
            <ChoiceChips
              size="sm"
              options={DURATION_PRESETS.map((d) => ({ value: String(d), label: durationLabel(d) }))}
              value={DURATION_PRESETS.some((d) => d === days) ? String(days) : null}
              onChange={(v) => setDays(Number(v))}
            />
          </FormField>

          <FormField label="Instructions">
            <ChoiceChips
              size="sm"
              options={INSTRUCTION_PRESETS.map((p) => ({ value: p, label: p }))}
              value={customInstruction.trim() ? null : instruction}
              onChange={(v) => {
                setCustomInstruction('');
                setInstruction((cur) => (cur === v ? null : v));
              }}
            />
            <FieldInput
              containerStyle={styles.chipsBelow}
              value={customInstruction}
              onChangeText={setCustomInstruction}
              placeholder="Or type instructions (optional)"
            />
          </FormField>
        </View>
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  freeText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: '#FAFCFF',
  },
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    minHeight: 56,
  },
  medIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medName: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  medMeta: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  stockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: 120,
  },
  stockDot: { width: 6, height: 6, borderRadius: 3 },
  stockText: { fontSize: 10.5, fontWeight: typography.fontWeights.semiBold, flexShrink: 1 },
  stockWarn: { fontSize: typography.fontSizes.xs, fontWeight: typography.fontWeights.semiBold, marginTop: 3 },
  empty: { textAlign: 'center', color: colors.textMuted, paddingVertical: spacing.xl },
  selected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  change: { color: colors.primary, fontWeight: typography.fontWeights.bold, fontSize: typography.fontSizes.sm },
  chipsBelow: { marginTop: spacing.sm },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary + '66',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    minWidth: 64,
    textAlign: 'center',
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
});
