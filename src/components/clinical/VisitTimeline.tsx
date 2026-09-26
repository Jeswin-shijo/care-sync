import React, { useState } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';
import { Badge, BadgeVariant } from '../common/Badge';
import { FadeInView, PressableScale, stagger } from '../common/Motion';
import { friendlyDate } from './format';
import type { IconName } from './types';

export interface TimelineEntry {
  id: string;
  /** ISO date (YYYY-MM-DD). */
  dateISO: string;
  time?: string;
  title: string;
  subtitle?: string;
  badge?: { label: string; variant: BadgeVariant };
  icon: IconName;
  color: string;
  /** Expandable details (tap to reveal). */
  details?: React.ReactNode;
  /** Navigate instead of expanding. */
  onPress?: () => void;
  /** Link text for onPress entries (default "Open"). */
  actionText?: string;
}

interface VisitTimelineProps {
  entries: TimelineEntry[];
  style?: StyleProp<ViewStyle>;
  /** Entry expanded on first render. */
  defaultExpandedId?: string;
}

/** Vertical clinical timeline (visits, appointments, notes) with tap-to-expand details. */
export const VisitTimeline: React.FC<VisitTimelineProps> = ({ entries, style, defaultExpandedId }) => {
  const [expanded, setExpanded] = useState<string | null>(defaultExpandedId ?? null);
  return (
    <View style={style}>
      {entries.map((e, i) => {
        const isOpen = expanded === e.id;
        const last = i === entries.length - 1;
        const pressable = !!e.details || !!e.onPress;
        const label = `${friendlyDate(e.dateISO)}${e.time ? ` ${e.time}` : ''}, ${e.title}${e.subtitle ? `, ${e.subtitle}` : ''}${e.badge ? `, ${e.badge.label}` : ''}`;
        const cardBody = (
          <>
                <View style={styles.cardHead}>
                  <Text style={styles.date}>
                    {friendlyDate(e.dateISO)}
                    {e.time ? ` • ${e.time}` : ''}
                  </Text>
                  {e.badge && <Badge label={e.badge.label} variant={e.badge.variant} size="sm" />}
                </View>
                <Text style={styles.title} numberOfLines={isOpen ? undefined : 2}>
                  {e.title}
                </Text>
                {!!e.subtitle && (
                  <Text style={styles.subtitle} numberOfLines={isOpen ? undefined : 1}>
                    {e.subtitle}
                  </Text>
                )}
                {isOpen && e.details ? (
                  <FadeInView offset={6} duration={240} style={styles.details}>
                    {e.details}
                  </FadeInView>
                ) : null}
                {pressable && (
                  <View style={styles.more}>
                    <Text style={styles.moreText}>{e.onPress ? e.actionText ?? 'Open' : isOpen ? 'Hide details' : 'View details'}</Text>
                    <Ionicons name={e.onPress ? 'chevron-forward' : isOpen ? 'chevron-up' : 'chevron-down'} size={13} color={colors.primary} />
                  </View>
                )}
          </>
        );
        return (
          <FadeInView key={e.id} delay={stagger(i, 50, 300)} offset={10}>
            <View style={styles.row}>
              <View style={styles.rail}>
                <View style={[styles.dot, { backgroundColor: e.color + '1F', borderColor: e.color }]}>
                  <Ionicons name={e.icon} size={14} color={e.color} />
                </View>
                {!last && <View style={styles.line} />}
              </View>
              {pressable ? (
                <PressableScale
                  onPress={() => (e.onPress ? e.onPress() : setExpanded(isOpen ? null : e.id))}
                  style={[styles.card, last && { marginBottom: 0 }]}
                  scaleTo={0.985}
                  accessibilityRole="button"
                  accessibilityState={e.details ? { expanded: isOpen } : undefined}
                  accessibilityLabel={label}
                >
                  {cardBody}
                </PressableScale>
              ) : (
                <View style={[styles.card, last && { marginBottom: 0 }]} accessible accessibilityLabel={label}>
                  {cardBody}
                </View>
              )}
            </View>
          </FadeInView>
        );
      })}
    </View>
  );
};

/** Small labelled block used inside expanded timeline details. */
export const DetailBlock: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <View style={styles.block}>
    <Text style={styles.blockLabel}>{label}</Text>
    {typeof children === 'string' ? <Text style={styles.blockText}>{children}</Text> : children}
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  rail: { alignItems: 'center', width: 30 },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  line: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 4 },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  date: { fontSize: typography.fontSizes.xs, color: colors.textMuted, fontWeight: typography.fontWeights.semiBold, flexShrink: 1 },
  title: { fontSize: typography.fontSizes.sm + 1, fontWeight: typography.fontWeights.bold, color: colors.text, marginTop: 4 },
  subtitle: { fontSize: typography.fontSizes.xs + 1, color: colors.textSecondary, marginTop: 2 },
  details: {
    marginTop: spacing.sm + 2,
    paddingTop: spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.sm + 2,
  },
  more: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: spacing.sm },
  moreText: { fontSize: typography.fontSizes.xs + 1, color: colors.primary, fontWeight: typography.fontWeights.semiBold },
  block: { gap: 3 },
  blockLabel: {
    fontSize: 10.5,
    fontWeight: typography.fontWeights.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  blockText: { fontSize: typography.fontSizes.sm, color: colors.text, lineHeight: 19 },
});
