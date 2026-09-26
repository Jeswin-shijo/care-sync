import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { PressableScale } from '../common/Motion';
import { PopCheck } from './PopCheck';

export interface SafetyItem {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  /** Rule / source citation shown in small print. */
  source?: string;
  /** When set, the user must tick this acknowledgement before confirming. */
  ackLabel?: string;
}

const TONE = {
  critical: { bg: colors.dangerLight, border: colors.danger + '55', fg: colors.dangerText, icon: 'alert-circle' as const, iconColor: colors.danger },
  warning: { bg: colors.warningLight, border: colors.warning + '66', fg: colors.warningText, icon: 'warning' as const, iconColor: colors.warning },
  info: { bg: colors.infoLight, border: colors.info + '44', fg: colors.infoText, icon: 'information-circle' as const, iconColor: colors.info },
};

interface SafetyChecklistProps {
  items: SafetyItem[];
  acked: Record<string, boolean>;
  onToggle: (id: string) => void;
  /** Highlight unticked acknowledgements (after a blocked confirm). */
  showErrors?: boolean;
}

/** Clinical safety prompts rendered inline (never as a modal over a sheet). */
export const SafetyChecklist: React.FC<SafetyChecklistProps> = ({ items, acked, onToggle, showErrors }) => (
  <View style={styles.list}>
    {items.map((item) => {
      const tone = TONE[item.severity];
      const done = !!acked[item.id];
      const missing = showErrors && item.ackLabel && !done;
      return (
        <View key={item.id} style={[styles.card, { backgroundColor: tone.bg, borderColor: missing ? colors.danger : tone.border }]}>
          <View style={styles.head}>
            <Ionicons name={tone.icon} size={18} color={tone.iconColor} />
            <Text style={[styles.title, { color: tone.fg }]}>{item.title}</Text>
          </View>
          <Text style={[styles.detail, { color: tone.fg }]}>{item.detail}</Text>
          {!!item.source && <Text style={styles.source}>{item.source}</Text>}
          {!!item.ackLabel && (
            <PressableScale
              scaleTo={0.98}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                onToggle(item.id);
              }}
              style={styles.ack}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: done }}
              accessibilityLabel={item.ackLabel}
            >
              <PopCheck checked={done} size={22} color={item.severity === 'critical' ? colors.danger : colors.primary} />
              <Text style={styles.ackText}>{item.ackLabel}</Text>
            </PressableScale>
          )}
          {missing && <Text style={styles.required}>Required before confirming</Text>}
        </View>
      );
    })}
  </View>
);

export const allAcknowledged = (items: SafetyItem[], acked: Record<string, boolean>) =>
  items.every((i) => !i.ackLabel || acked[i.id]);

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  card: { borderRadius: radius.md, borderWidth: 1.5, padding: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, fontSize: typography.fontSizes.sm + 0.5, fontWeight: typography.fontWeights.bold },
  detail: { fontSize: typography.fontSizes.xs + 1, lineHeight: 17, marginTop: 4 },
  source: { fontSize: 10, color: colors.textMuted, marginTop: 4 },
  ack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.75)',
    minHeight: 44,
  },
  ackText: { flex: 1, fontSize: typography.fontSizes.xs + 1, fontWeight: typography.fontWeights.semiBold, color: colors.text },
  required: { fontSize: 10.5, fontWeight: typography.fontWeights.bold, color: colors.danger, marginTop: 6 },
});
