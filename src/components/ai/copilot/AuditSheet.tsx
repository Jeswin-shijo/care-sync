import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AuditEntry } from '../../../data/mockData';
import { colors, radius, spacing, typography } from '../../../constants/theme';
import { BottomSheet } from '../../common/BottomSheet';
import { formatClock } from '../../../utils/dates';

interface AuditSheetProps {
  visible: boolean;
  onClose: () => void;
  entries: AuditEntry[];
}

const ago = (at: number) => {
  const mins = Math.max(0, Math.round((Date.now() - at) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  return h < 24 ? `${h}h ago` : formatClock(new Date(at));
};

const isAi = (e: AuditEntry) => /medios|ai /i.test(e.actor) || /\bai\b|ai-drafted/i.test(e.action);

/** Immutable audit trail — every AI answer, approval and order is logged with actor and role. */
export const AuditSheet: React.FC<AuditSheetProps> = ({ visible, onClose, entries }) => {
  const list = entries.slice(0, 30);
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Audit log" subtitle={`${entries.length} entries • every AI query, approval and order`} maxHeight={0.85}>
      {!list.length && <Text style={styles.empty}>No activity logged yet.</Text>}
      {list.map((e) => {
        const ai = isAi(e);
        return (
          <View key={e.id} style={styles.row} accessible accessibilityLabel={`${e.actor}, ${e.action}${e.target ? `, ${e.target}` : ''}, ${ago(e.at)}`}>
            <View style={[styles.icon, ai && styles.iconAi]}>
              <Ionicons name={ai ? 'sparkles' : 'person-outline'} size={13} color={ai ? colors.primary : colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.action} numberOfLines={2}>
                {e.action}
                {e.target ? <Text style={styles.target}> • {e.target}</Text> : null}
              </Text>
              <Text style={styles.meta}>
                {e.actor} • {e.role} • {ago(e.at)}
              </Text>
            </View>
          </View>
        );
      })}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    paddingVertical: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconAi: {
    backgroundColor: colors.primaryLight,
  },
  action: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  target: {
    fontWeight: typography.fontWeights.regular,
    color: colors.textSecondary,
  },
  meta: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
    textTransform: 'none',
  },
});
