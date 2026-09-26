import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../../constants/theme';
import { Button } from '../../common/Button';
import { EmptyState } from '../../common/EmptyState';
import { FadeInView, stagger } from '../../common/Motion';
import { CitationChips } from '../CitationChips';
import type { Insight, PatientContext } from '../copilotEngine';

export interface InsightMark {
  status: 'accepted' | 'dismissed';
  title: string;
  severity: Insight['severity'];
  /** What accepting did, e.g. "Ordered SMP-2026-9030" or "Added to plan". */
  result?: string;
  at: string;
}

const SEVERITY = {
  critical: { color: colors.danger, bg: colors.dangerLight, icon: 'alert-circle' as const, label: 'High priority' },
  warning: { color: '#D97706', bg: colors.warningLight, icon: 'warning' as const, label: 'Review' },
  info: { color: colors.primary, bg: colors.primaryLight, icon: 'information-circle' as const, label: 'Consider' },
};

const ACTION_ICON = {
  'order-lab': 'flask' as const,
  'order-scan': 'scan' as const,
  'add-plan': 'add-circle' as const,
  'safer-alternative': 'swap-horizontal' as const,
  call: 'call' as const,
  open: 'open-outline' as const,
};

interface InsightsPanelProps {
  ctx: PatientContext;
  insights: Insight[];
  /** Keyed by insight id, for this patient. */
  marks: Record<string, InsightMark>;
  busyId: string | null;
  onAccept: (insight: Insight) => void;
  onDismiss: (insight: Insight) => void;
  onRestore: (insightId: string) => void;
}

const InsightCard: React.FC<{ insight: Insight; index: number; busy: boolean; onAccept: () => void; onDismiss: () => void }> = ({
  insight,
  index,
  busy,
  onAccept,
  onDismiss,
}) => {
  const [allSteps, setAllSteps] = useState(false);
  const s = SEVERITY[insight.severity];
  const steps = allSteps ? insight.steps : insight.steps.slice(0, 3);
  return (
    <FadeInView delay={stagger(index, 70)} offset={10} style={[styles.card, { borderLeftColor: s.color }]}>
      <View style={styles.cardHead}>
        <View style={[styles.sev, { backgroundColor: s.bg }]}>
          <Ionicons name={s.icon} size={12} color={s.color} />
          <Text style={[styles.sevText, { color: s.color }]}>{s.label}</Text>
        </View>
        <Text style={styles.category} numberOfLines={1}>
          {insight.category}
        </Text>
      </View>
      <Text style={styles.title}>{insight.title}</Text>
      <Text style={styles.evidence}>{insight.evidence}</Text>
      {!!steps.length && (
        <View style={styles.steps}>
          {steps.map((step, i) => (
            <View key={`${insight.id}-s${i}`} style={styles.step}>
              <View style={styles.stepNo}>
                <Text style={styles.stepNoText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
          {insight.steps.length > 3 && (
            <Pressable onPress={() => setAllSteps((v) => !v)} hitSlop={6} accessibilityRole="button">
              <Text style={styles.moreSteps}>{allSteps ? 'Show fewer steps' : `Show all ${insight.steps.length} steps`}</Text>
            </Pressable>
          )}
        </View>
      )}
      <CitationChips citations={insight.citations} style={styles.cites} />
      <View style={styles.actions}>
        <Button
          title={insight.action.label}
          size="sm"
          onPress={onAccept}
          loading={busy}
          fullWidth
          icon={<Ionicons name={ACTION_ICON[insight.action.kind]} size={15} color="#FFFFFF" />}
        />
        <Button title="Dismiss" size="sm" variant="ghost" onPress={onDismiss} disabled={busy} textStyle={{ color: colors.textSecondary }} />
      </View>
    </FadeInView>
  );
};

/** "Clinical Insights": data-derived decision support with protocol citations. Accept acts; Dismiss hides. */
export const InsightsPanel: React.FC<InsightsPanelProps> = ({ ctx, insights, marks, busyId, onAccept, onDismiss, onRestore }) => {
  const [showDismissed, setShowDismissed] = useState(false);
  const active = insights.filter((i) => !marks[i.id]);
  const accepted = Object.entries(marks).filter(([, m]) => m.status === 'accepted');
  const dismissed = Object.entries(marks).filter(([, m]) => m.status === 'dismissed');
  const first = ctx.patient.name.split(' ')[0];

  return (
    <View>
      <View style={styles.disclaimer}>
        <Ionicons name="shield-half-outline" size={15} color="#5B21B6" />
        <Text style={styles.disclaimerText}>Evidence-based suggestions — not a final diagnosis. Nothing is ordered until you accept it.</Text>
      </View>

      {!insights.length && !accepted.length && (
        <EmptyState
          icon="checkmark-done-outline"
          title="No decision-support flags"
          description={`${first}'s tracked results, vitals and prescriptions are within hospital protocol thresholds.`}
        />
      )}

      {active.map((insight, i) => (
        <InsightCard
          key={insight.id}
          insight={insight}
          index={i}
          busy={busyId === insight.id}
          onAccept={() => onAccept(insight)}
          onDismiss={() => onDismiss(insight)}
        />
      ))}

      {!!insights.length && !active.length && (
        <View style={styles.allDone}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={styles.allDoneText}>All suggestions for {first} have been reviewed.</Text>
        </View>
      )}

      {!!accepted.length && (
        <>
          <Text style={styles.section}>Accepted ({accepted.length})</Text>
          {accepted.map(([id, m]) => (
            <FadeInView key={id} offset={6} style={styles.markRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.markTitle} numberOfLines={2}>
                  {m.title}
                </Text>
                <Text style={styles.markMeta}>
                  {m.result ?? 'Accepted'} • {m.at}
                </Text>
              </View>
            </FadeInView>
          ))}
        </>
      )}

      {!!dismissed.length && (
        <>
          <Pressable onPress={() => setShowDismissed((v) => !v)} style={styles.dismissedToggle} accessibilityRole="button">
            <Text style={styles.section}>Dismissed ({dismissed.length})</Text>
            <Ionicons name={showDismissed ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
          </Pressable>
          {showDismissed &&
            dismissed.map(([id, m]) => (
              <View key={id} style={styles.markRow}>
                <Ionicons name="eye-off-outline" size={16} color={colors.textMuted} />
                <Text style={[styles.markTitle, { flex: 1, color: colors.textSecondary }]} numberOfLines={2}>
                  {m.title}
                </Text>
                <Button title="Restore" size="sm" variant="ghost" onPress={() => onRestore(id)} />
              </View>
            ))}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.purpleLight,
    marginBottom: spacing.md,
  },
  disclaimerText: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 0.5,
    color: '#5B21B6',
    lineHeight: 16,
    fontWeight: typography.fontWeights.medium,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderLeftWidth: 4,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: '#FFFFFF',
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sev: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  sevText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.extraBold,
    textTransform: 'uppercase',
  },
  category: {
    flex: 1,
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.semiBold,
  },
  title: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  evidence: {
    fontSize: typography.fontSizes.sm - 0.5,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
  steps: {
    marginTop: spacing.sm,
    gap: 5,
  },
  step: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stepNo: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNoText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  stepText: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.text,
    lineHeight: 17,
  },
  moreSteps: {
    fontSize: typography.fontSizes.xs + 0.5,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
    marginLeft: 26,
  },
  cites: {
    marginTop: spacing.sm,
  },
  actions: {
    gap: 2,
    marginTop: spacing.md,
  },
  allDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.successLight,
    marginBottom: spacing.sm,
  },
  allDoneText: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    color: colors.successText,
    fontWeight: typography.fontWeights.semiBold,
  },
  section: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  },
  markRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  markTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  markMeta: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  dismissedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
  },
});
