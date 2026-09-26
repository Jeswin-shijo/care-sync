import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Medicine } from '../../data/mockData';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { useToast } from '../../context/ToastContext';
import { FadeInView, PressableScale } from '../common/Motion';
import { MedicinePickerSheet } from './MedicinePickerSheet';
import { RxLine, rxSummary, stockStateFor } from './rx';

export interface PrescriptionBuilderHandle {
  /** Opens the medicine picker, optionally pre-searching (e.g. a safer alternative). */
  openAdd: (query?: string) => void;
  /** Removes a line with an "Undo" toast. */
  removeLine: (key: string) => void;
}

interface PrescriptionBuilderProps {
  lines: RxLine[];
  onChange: (lines: RxLine[]) => void;
  medicines: Medicine[];
  /** Keys of lines involved in a safety alert (highlighted). */
  flagged?: Record<string, 'critical' | 'warning' | 'info'>;
  disabled?: boolean;
  disabledHint?: string;
  style?: StyleProp<ViewStyle>;
}

/** Editable prescription list: add from inventory or free text, edit dosing, remove with undo. */
export const PrescriptionBuilder = forwardRef<PrescriptionBuilderHandle, PrescriptionBuilderProps>(
  ({ lines, onChange, medicines, flagged = {}, disabled, disabledHint, style }, ref) => {
    const { showToast } = useToast();
    const [sheet, setSheet] = useState<{ visible: boolean; editing: RxLine | null; query?: string }>({
      visible: false,
      editing: null,
    });
    const linesRef = useRef(lines);
    linesRef.current = lines;
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useImperativeHandle(ref, () => ({
      openAdd: (query?: string) => {
        if (!disabled) setSheet({ visible: true, editing: null, query });
      },
      removeLine: (key: string) => {
        const line = linesRef.current.find((l) => l.key === key);
        if (line) remove(line);
      },
    }));

    const upsert = (line: RxLine) => {
      const cur = linesRef.current;
      const exists = cur.some((l) => l.key === line.key);
      onChangeRef.current(exists ? cur.map((l) => (l.key === line.key ? line : l)) : [...cur, line]);
    };

    const remove = (line: RxLine) => {
      const cur = linesRef.current;
      const index = cur.findIndex((l) => l.key === line.key);
      onChangeRef.current(cur.filter((l) => l.key !== line.key));
      showToast({
        message: `Removed ${line.name}`,
        type: 'info',
        action: {
          label: 'Undo',
          onPress: () => {
            const now = linesRef.current;
            if (now.some((l) => l.key === line.key)) return;
            const next = [...now];
            next.splice(Math.min(index, next.length), 0, line);
            onChangeRef.current(next);
          },
        },
      });
    };

    return (
      <View style={style}>
        {lines.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="medkit-outline" size={20} color={colors.textMuted} />
            <Text style={styles.emptyText}>{disabled ? disabledHint ?? 'Select a patient first.' : 'No medicines added yet.'}</Text>
          </View>
        ) : (
          lines.map((line, i) => {
            const med = line.medicineId ? medicines.find((m) => m.id === line.medicineId) : undefined;
            const stock = med ? stockStateFor(med) : null;
            const flag = flagged[line.key];
            return (
              <FadeInView key={line.key} offset={8} duration={260}>
                <PressableScale
                  onPress={() => setSheet({ visible: true, editing: line })}
                  style={[
                    styles.row,
                    flag === 'critical' && styles.rowCritical,
                    flag === 'warning' && styles.rowWarning,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${line.name}, ${rxSummary(line)}. Tap to edit`}
                >
                  <View style={[styles.index, flag === 'critical' && { backgroundColor: colors.danger }, flag === 'warning' && { backgroundColor: colors.warning }]}>
                    {flag === 'critical' || flag === 'warning' ? (
                      <Ionicons name="warning" size={13} color="#FFFFFF" />
                    ) : (
                      <Text style={styles.indexText}>{i + 1}</Text>
                    )}
                  </View>
                  <View style={styles.body}>
                    <Text style={styles.name} numberOfLines={2}>
                      {line.name}
                    </Text>
                    <Text style={styles.detail} numberOfLines={2}>
                      {rxSummary(line)}
                    </Text>
                    {!med ? (
                      <Text style={[styles.stock, { color: colors.textMuted }]}>Free text • not in inventory</Text>
                    ) : stock && stock.tone !== 'ok' ? (
                      <Text style={[styles.stock, { color: stock.tone === 'low' || stock.tone === 'soon' ? colors.warningText : colors.dangerText }]}>
                        {stock.label}
                      </Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => remove(line)}
                    style={styles.remove}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${line.name}`}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                </PressableScale>
              </FadeInView>
            );
          })
        )}

        <PressableScale
          onPress={() => setSheet({ visible: true, editing: null })}
          disabled={disabled}
          style={styles.add}
          accessibilityRole="button"
          accessibilityLabel="Add medicine"
        >
          <Ionicons name="add-circle" size={18} color={colors.primary} />
          <Text style={styles.addText}>Add Medicine</Text>
        </PressableScale>

        <MedicinePickerSheet
          visible={sheet.visible}
          onClose={() => setSheet((s) => ({ ...s, visible: false }))}
          onSubmit={upsert}
          medicines={medicines}
          initial={sheet.editing}
          initialQuery={sheet.query}
        />
      </View>
    );
  }
);
PrescriptionBuilder.displayName = 'PrescriptionBuilder';

const styles = StyleSheet.create({
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  emptyText: { flex: 1, fontSize: typography.fontSizes.sm, color: colors.textSecondary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowCritical: { backgroundColor: colors.dangerLight, borderColor: colors.danger + '55' },
  rowWarning: { backgroundColor: colors.warningLight, borderColor: colors.warning + '55' },
  index: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: { color: '#FFFFFF', fontSize: 12, fontWeight: typography.fontWeights.bold },
  body: { flex: 1 },
  name: { fontSize: typography.fontSizes.sm + 1, fontWeight: typography.fontWeights.bold, color: colors.text },
  detail: { fontSize: typography.fontSizes.xs + 1, color: colors.textSecondary, marginTop: 2 },
  stock: { fontSize: typography.fontSizes.xs, fontWeight: typography.fontWeights.semiBold, marginTop: 3 },
  remove: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 46,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: '#FAFCFF',
  },
  addText: { color: colors.primary, fontWeight: typography.fontWeights.bold, fontSize: typography.fontSizes.sm + 1 },
});
