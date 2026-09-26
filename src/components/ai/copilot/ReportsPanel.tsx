import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LabParameter } from '../../../data/mockData';
import type { AiActionCard } from '../../../logic/hospital';
import type { AiAnswer } from '../../../logic/aiEngine';
import { formatParamValue, parameterFlag, referenceText } from '../../../logic/clinical';
import { colors, radius, spacing, typography } from '../../../constants/theme';
import { Badge, statusVariant } from '../../common/Badge';
import { Button } from '../../common/Button';
import { EmptyState } from '../../common/EmptyState';
import { FadeInView, stagger } from '../../common/Motion';
import { formatDayMonth, relativeDayLabel, todayISO } from '../../../utils/dates';
import { AiAnswerCard } from '../AiAnswerCard';
import { compactValue, PatientContext, pendingLabOrders, pendingScans, testShort } from '../copilotEngine';
import { LabTrendChart } from './LabTrendChart';

export interface ExplainState {
  pending: boolean;
  answer?: AiAnswer;
  askedAt: string;
  createdAt: number;
  streamed?: boolean;
}

interface ReportsPanelProps {
  ctx: PatientContext;
  explain?: ExplainState;
  onExplain: () => void;
  onCloseExplain: () => void;
  onExplainStreamed: () => void;
  onActionPress: (card: AiActionCard) => void;
  onOrderTests: () => void;
}

const FLAG_STYLE = {
  H: { color: colors.danger, bg: colors.dangerLight, icon: 'arrow-up' as const, label: 'High' },
  L: { color: '#B45309', bg: colors.warningLight, icon: 'arrow-down' as const, label: 'Low' },
};

/** referenceText, with big counts compacted so the column never truncates (150000–450000 → 1.5L–4.5L). */
const refLabel = (p: LabParameter) => {
  const big = (p.low ?? 0) >= 1000 || (p.high ?? 0) >= 1000;
  if (!big) return referenceText(p);
  if (typeof p.low === 'number' && typeof p.high === 'number') return `${compactValue(p.low)}–${compactValue(p.high)}`;
  if (typeof p.high === 'number') return `< ${compactValue(p.high)}`;
  return `> ${compactValue(p.low ?? 0)}`;
};

const ParamRow: React.FC<{ p: LabParameter; last: boolean }> = ({ p, last }) => {
  const flag = parameterFlag(p);
  const f = flag ? FLAG_STYLE[flag] : null;
  return (
    <View style={[styles.tr, !last && styles.trBorder]} accessibilityLabel={`${p.name} ${formatParamValue(p)} ${p.unit}${f ? `, ${f.label}` : ''}. Reference ${refLabel(p)}`}>
      <Text style={[styles.td, styles.tdName]} numberOfLines={2}>
        {p.name}
      </Text>
      <View style={[styles.tdResult]}>
        <Text style={[styles.value, f && { color: f.color }]} numberOfLines={1}>
          {formatParamValue(p)} <Text style={styles.valueUnit}>{p.unit}</Text>
        </Text>
        {f && (
          <View style={[styles.flag, { backgroundColor: f.bg }]}>
            <Ionicons name={f.icon} size={9} color={f.color} />
            <Text style={[styles.flagText, { color: f.color }]}>{flag}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.td, styles.tdRef]} numberOfLines={1}>
        {refLabel(p)}
      </Text>
    </View>
  );
};

/** "Analyze Reports": this patient's lab tables, trends vs previous, imaging and pending orders. */
export const ReportsPanel: React.FC<ReportsPanelProps> = ({ ctx, explain, onExplain, onCloseExplain, onExplainStreamed, onActionPress, onOrderTests }) => {
  const [showOlder, setShowOlder] = useState(false);
  const { labResults, trends, radiology } = ctx;
  const pendingLabs = pendingLabOrders(ctx);
  const pendingImaging = pendingScans(ctx);
  const reported = radiology.filter((r) => r.status === 'Reported');
  const comparable = trends.filter((t) => t.points.length >= 2);
  const visibleResults = showOlder ? labResults : labResults.slice(0, 2);
  const first = ctx.patient.name.split(' ')[0];

  // Reference ranges come from the latest result carrying each parameter.
  const referenceFor = (parameter: string) => {
    for (const r of labResults) {
      const p = r.parameters?.find((x) => x.name === parameter);
      if (p) return { low: p.low, high: p.high };
    }
    return undefined;
  };

  if (!labResults.length && !radiology.length && !pendingLabs.length) {
    return (
      <EmptyState
        icon="flask-outline"
        title="No reports on record"
        description={`${first} has no lab or imaging results in CareSync yet.`}
        actionTitle="Order lab tests"
        onActionPress={onOrderTests}
      />
    );
  }

  return (
    <View>
      <View style={styles.headRow}>
        <Text style={styles.section}>Lab results ({labResults.length})</Text>
        <Button
          title={explain?.pending ? 'Explaining…' : 'Explain'}
          size="sm"
          variant="secondary"
          onPress={onExplain}
          disabled={!labResults.length || !!explain?.pending}
          icon={<Ionicons name="sparkles" size={14} color={colors.secondary} />}
        />
      </View>

      {explain && (
        <AiAnswerCard
          title={`Report explanation — ${ctx.patient.name}`}
          meta={`Asked ${explain.askedAt} • from LIS results only`}
          answer={explain.answer}
          stream={!explain.streamed}
          onStreamDone={onExplainStreamed}
          onActionPress={onActionPress}
          onClose={explain.pending ? undefined : onCloseExplain}
          style={styles.explain}
        />
      )}

      {!labResults.length && <Text style={styles.muted}>No finalised lab results yet.</Text>}
      {visibleResults.map((r, i) => (
        <FadeInView key={r.id} delay={stagger(i, 60)} offset={8} style={styles.result}>
          <View style={styles.resultHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.resultTitle}>{r.testName}</Text>
              <Text style={styles.resultMeta} numberOfLines={1}>
                {relativeDayLabel(r.date ?? todayISO())} • {r.collectedAt} • {r.sampleCode}
              </Text>
            </View>
            <Badge label={r.status} variant={statusVariant(r.status)} size="sm" />
          </View>
          <View style={styles.table}>
            <View style={[styles.tr, styles.th]}>
              <Text style={[styles.thText, styles.tdName]}>Parameter</Text>
              <Text style={[styles.thText, styles.tdResult]}>Result</Text>
              <Text style={[styles.thText, styles.tdRef]}>Reference</Text>
            </View>
            {(r.parameters ?? []).map((p, idx, arr) => (
              <ParamRow key={p.name} p={p} last={idx === arr.length - 1} />
            ))}
          </View>
          {!!r.flag && (
            <View style={styles.interp}>
              <Ionicons name="alert-circle" size={13} color={colors.danger} />
              <Text style={styles.interpText}>{r.flag}</Text>
            </View>
          )}
          <Text style={styles.orderedBy}>Ordered by {r.orderedBy ?? '—'}</Text>
        </FadeInView>
      ))}
      {labResults.length > 2 && (
        <Pressable onPress={() => setShowOlder((v) => !v)} style={styles.more} accessibilityRole="button">
          <Text style={styles.moreText}>{showOlder ? 'Show fewer results' : `Show ${labResults.length - 2} older result${labResults.length - 2 === 1 ? '' : 's'}`}</Text>
          <Ionicons name={showOlder ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
        </Pressable>
      )}

      {!!comparable.length && (
        <>
          <Text style={[styles.section, styles.sectionGap]}>Compare with previous</Text>
          {comparable.slice(0, 6).map((t, i) => (
            <LabTrendChart key={`${t.test}-${t.parameter}`} trend={t} reference={referenceFor(t.parameter)} delay={i * 80} />
          ))}
        </>
      )}

      {!!reported.length && (
        <>
          <Text style={[styles.section, styles.sectionGap]}>Radiology reports</Text>
          {reported.map((o) => (
            <View key={o.id} style={styles.rad}>
              <View style={styles.resultHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultTitle}>{o.scanName}</Text>
                  <Text style={styles.resultMeta}>
                    {relativeDayLabel(o.date)} • {o.time} • {o.orderedBy}
                  </Text>
                </View>
                <Badge label={o.status} variant={statusVariant(o.status)} size="sm" />
              </View>
              {!!o.findings && (
                <Text style={styles.radText}>
                  <Text style={styles.radLabel}>Findings: </Text>
                  {o.findings}
                </Text>
              )}
              {!!o.impression && (
                <Text style={styles.radText}>
                  <Text style={styles.radLabel}>Impression: </Text>
                  {o.impression}
                </Text>
              )}
            </View>
          ))}
        </>
      )}

      {!!(pendingLabs.length || pendingImaging.length) && (
        <>
          <Text style={[styles.section, styles.sectionGap]}>Pending orders</Text>
          {pendingLabs.map((s) => (
            <View key={s.id} style={styles.pending}>
              <Ionicons name={s.status === 'New' ? 'hourglass-outline' : 'sync-outline'} size={15} color={colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingTitle}>{testShort(s.testName)} • {s.sampleCode}</Text>
                <Text style={styles.pendingMeta}>
                  {formatDayMonth(s.date ?? todayISO())} • {s.turnaroundTime}
                </Text>
              </View>
              <Badge label={s.status} variant={statusVariant(s.status)} size="sm" />
            </View>
          ))}
          {pendingImaging.map((o) => (
            <View key={o.id} style={styles.pending}>
              <Ionicons name="scan-outline" size={15} color={colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingTitle}>{o.scanName}</Text>
                <Text style={styles.pendingMeta}>
                  {relativeDayLabel(o.date)} • {o.time}
                </Text>
              </View>
              <Badge label={o.status} variant={statusVariant(o.status)} size="sm" />
            </View>
          ))}
        </>
      )}

      <Button
        title="Order more tests"
        variant="ghost"
        size="sm"
        onPress={onOrderTests}
        icon={<Ionicons name="add-circle-outline" size={16} color={colors.primary} />}
        style={styles.order}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  section: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionGap: {
    marginTop: spacing.base,
    marginBottom: spacing.xs,
  },
  explain: {
    marginBottom: spacing.md,
  },
  muted: {
    fontSize: typography.fontSizes.sm,
    color: colors.textMuted,
  },
  result: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  resultHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  resultTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  resultMeta: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  table: {
    marginTop: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  tr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    gap: spacing.xs,
  },
  trBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  th: {
    backgroundColor: colors.cardMuted,
    paddingVertical: 5,
  },
  thText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  td: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.text,
  },
  tdName: {
    flex: 1.1,
  },
  tdResult: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tdRef: {
    flex: 0.9,
    textAlign: 'right',
    color: colors.textMuted,
  },
  value: {
    flexShrink: 1,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  valueUnit: {
    fontSize: 10,
    fontWeight: typography.fontWeights.regular,
    color: colors.textMuted,
  },
  flag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  flagText: {
    fontSize: 9,
    fontWeight: typography.fontWeights.extraBold,
  },
  interp: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginTop: spacing.sm,
  },
  interpText: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.dangerText,
    lineHeight: 16,
  },
  orderedBy: {
    fontSize: typography.fontSizes.xs - 1,
    color: colors.textMuted,
    marginTop: 6,
  },
  more: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 36,
  },
  moreText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  rad: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: 6,
  },
  radText: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  radLabel: {
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  pending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  pendingTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  pendingMeta: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  order: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
});
