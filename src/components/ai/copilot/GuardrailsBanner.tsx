import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../../constants/theme';
import { PressableScale } from '../../common/Motion';

interface GuardrailsBannerProps {
  auditCount: number;
  roleLabel: string;
  onOpenAudit: () => void;
}

/** Design: AI output guardrails & compliance — human confirmation, citations, audit logging, RBAC. */
export const GuardrailsBanner = React.memo(function GuardrailsBanner({ auditCount, roleLabel, onOpenAudit }: GuardrailsBannerProps) {
  const items: Array<{ icon: keyof typeof Ionicons.glyphMap; title: string; sub: string; onPress?: () => void }> = [
    { icon: 'hand-left-outline', title: 'Human confirmation', sub: 'You approve every draft & order' },
    { icon: 'link-outline', title: 'Source citations', sub: 'Each answer cites its records' },
    { icon: 'list-outline', title: 'Audit logging', sub: `${auditCount} entries • tap to view`, onPress: onOpenAudit },
    { icon: 'lock-closed-outline', title: 'RBAC', sub: `Signed in as ${roleLabel}` },
  ];
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Ionicons name="shield-checkmark" size={16} color={colors.success} />
        <Text style={styles.title}>MediOS AI clinical guardrails</Text>
      </View>
      <View style={styles.grid}>
        {items.map((it) => {
          const body = (
            <>
              <Ionicons name={it.icon} size={16} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{it.title}</Text>
                <Text style={styles.itemSub} numberOfLines={2}>
                  {it.sub}
                </Text>
              </View>
              {it.onPress && <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />}
            </>
          );
          return it.onPress ? (
            <PressableScale key={it.title} onPress={it.onPress} style={styles.item} accessibilityRole="button" accessibilityLabel="Open audit log">
              {body}
            </PressableScale>
          ) : (
            <View key={it.title} style={styles.item}>
              {body}
            </View>
          );
        })}
      </View>
      <Text style={styles.foot}>All recommendations require confirmation by a licensed clinician before action.</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F1F5F9',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
  },
  item: {
    width: '48.8%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: spacing.sm,
    minHeight: 56,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
  },
  itemTitle: {
    fontSize: typography.fontSizes.xs + 0.5,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  itemSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
    lineHeight: 13,
  },
  foot: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
