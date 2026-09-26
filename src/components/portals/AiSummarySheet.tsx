import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { HospitalProtocol, LabParameter, LabSample } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { parameterFlag } from '../../logic/clinical';
import { exportDocument, DocumentSpec } from '../../utils/pdfGenerator';
import { formatDisplayDate, todayISO } from '../../utils/dates';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { BottomSheet } from '../common/BottomSheet';
import { Button } from '../common/Button';
import { FadeInView, Skeleton, stagger, TypingDots } from '../common/Motion';
import { displayValue } from './ParamTable';
import { letterhead } from './documents';
import { durationLabel, minutesSince, useNow } from './useNow';

interface Suggestion {
  action: string;
  protocolId?: string;
  rule?: string;
}

const flaggedParams = (s: LabSample) => (s.parameters ?? []).filter((p) => parameterFlag(p));
const has = (params: LabParameter[], name: RegExp, flag: 'H' | 'L') => params.some((p) => name.test(p.name) && parameterFlag(p) === flag);

/** Next step for an abnormal result, citing the hospital protocol / safety rule it comes from. */
const suggestFor = (s: LabSample): Suggestion => {
  const n = s.testName.toLowerCase();
  const f = flaggedParams(s);
  if (/hba1c/.test(n)) return { action: 'Intensify glycaemic control — review oral agents, consider basal insulin; retinopathy screen.', protocolId: 'proto-3' };
  if (/troponin/.test(n)) return { action: 'Serial troponin and 12-lead ECG; start the ACS pathway.', protocolId: 'proto-4' };
  if (/dengue/.test(n)) return { action: 'Check warning signs and platelet trend; fluids per dengue protocol.', protocolId: 'proto-5' };
  if (/lft|liver/.test(n)) return { action: 'Review hepatotoxic drugs and repeat LFT in 48–72 h.', rule: 'HEP-CAUTION' };
  if (/kft|kidney/.test(n)) return { action: 'Renal-dose review of all drugs; avoid NSAIDs and contrast; repeat creatinine in 48 h.', rule: 'RENAL-DOSE' };
  if (/cbc|blood count/.test(n)) {
    if (has(f, /tlc|wbc/i, 'H')) return { action: 'Leukocytosis — screen for sepsis (qSOFA, lactate); cultures before escalating antibiotics.', protocolId: 'proto-1' };
    if (has(f, /platelet/i, 'L')) return { action: 'Thrombocytopenia — check dengue warning signs; transfuse only if < 10,000/mcL or bleeding.', protocolId: 'proto-5' };
    if (has(f, /tlc|wbc/i, 'L')) return { action: 'Leukopenia — correlate with recent viral illness; repeat CBC in 48 h.' };
    if (has(f, /h(a)?emoglobin/i, 'L')) return { action: 'Anaemia work-up: iron studies and reticulocyte count.' };
  }
  if (/lipid/.test(n)) return { action: 'LDL above target — review statin intensity and lifestyle advice.' };
  if (/thyroid/.test(n)) return { action: 'Correlate TSH with symptoms; adjust thyroxine if on treatment.' };
  return { action: 'Clinical correlation required — inform the ordering doctor.' };
};

/** Critical when a value is ≥ 1.5× beyond its limit or the LIS flags a critical trend. */
const isCritical = (s: LabSample) =>
  /critical|rising|declining/i.test(s.flag ?? '') ||
  flaggedParams(s).some((p) => (parameterFlag(p) === 'H' ? p.value / (p.high ?? p.value) >= 1.5 : (p.low ?? p.value) / Math.max(p.value, 0.0001) >= 1.5));

const citationFor = (sug: Suggestion, protocols: HospitalProtocol[]) => {
  if (sug.protocolId) {
    const p = protocols.find((x) => x.id === sug.protocolId);
    if (p) return `Protocol: ${p.title} (updated ${p.lastUpdated})`;
  }
  if (sug.rule) return `Safety rule ${sug.rule}`;
  return null;
};

interface AiSummarySheetProps {
  visible: boolean;
  onClose: () => void;
}

/** MediOS AI summary of today's lab worklist, built from the live samples. */
export const AiSummarySheet: React.FC<AiSummarySheetProps> = ({ visible, onClose }) => {
  const { labSamples, labPipeline, hospitalProtocols, hospitalProfile } = useApp();
  const { showToast } = useToast();
  const now = useNow(60000);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 650);
    return () => clearTimeout(t);
  }, [visible]);

  const today = todayISO();
  const data = useMemo(() => {
    const todays = labSamples.filter((s) => s.date === today);
    const abnormal = todays.filter((s) => s.status === 'Abnormal');
    const groups: Array<{ key: string; name: string; uhid: string; samples: LabSample[] }> = [];
    abnormal.forEach((s) => {
      const key = s.patientId ?? s.patientName;
      const g = groups.find((x) => x.key === key);
      if (g) g.samples.push(s);
      else groups.push({ key, name: s.patientName, uhid: s.uhid, samples: [s] });
    });
    groups.sort((a, b) => Number(b.samples.some(isCritical)) - Number(a.samples.some(isCritical)));
    const processing = labSamples.filter((s) => s.status === 'Processing');
    const awaiting = labSamples.filter((s) => s.status === 'New');
    const oldest = processing
      .map((s) => ({ s, mins: minutesSince(s.date, s.collectedAt, now) }))
      .filter((x): x is { s: LabSample; mins: number } => typeof x.mins === 'number' && x.mins >= 0)
      .sort((a, b) => b.mins - a.mins)[0];
    const doctors = Array.from(new Set(abnormal.map((s) => s.orderedBy).filter((d): d is string => !!d)));
    return { abnormal, groups, processing, awaiting, oldest, doctors };
  }, [labSamples, today, now]);

  const hiddenAbnormal = Math.max(0, labPipeline.Abnormal - data.abnormal.length);
  const criticalCount = data.abnormal.filter(isCritical).length;

  const tatLine = data.oldest
    ? `${data.processing.length} sample${data.processing.length === 1 ? '' : 's'} in analyzers — oldest ${data.oldest.s.sampleCode} collected ${data.oldest.s.collectedAt} (${durationLabel(data.oldest.mins)} ago)${data.oldest.mins > 240 ? ' — beyond the 4 h routine TAT, escalate' : ' — within the 4 h routine TAT'}.`
    : data.processing.length
      ? `${data.processing.length} sample${data.processing.length === 1 ? '' : 's'} in analyzers.`
      : 'No samples waiting in analyzers.';
  const awaitingLine = data.awaiting.length
    ? `${data.awaiting.length} sample${data.awaiting.length === 1 ? '' : 's'} awaiting collection / receipt in this worklist.`
    : 'No samples awaiting collection in this worklist.';

  const notify = () => {
    onClose();
    if (!data.doctors.length) {
      showToast({ type: 'info', title: 'Nothing to notify', message: 'There are no abnormal results today.' });
      return;
    }
    showToast({
      type: 'success',
      title: 'Ordering doctors notified',
      message: `${data.abnormal.length} abnormal result${data.abnormal.length > 1 ? 's' : ''} sent to ${data.doctors.join(', ')} via secure message.`,
      duration: 4000,
    });
  };

  const exportPdf = async () => {
    setExporting(true);
    const spec: DocumentSpec = {
      title: 'Lab AI Summary',
      subtitle: `Worklist of ${formatDisplayDate(today)}`,
      meta: [
        ['Pipeline', `New ${labPipeline.New} • Processing ${labPipeline.Processing} • Completed ${labPipeline.Completed} • Abnormal ${labPipeline.Abnormal}`],
        ['Itemised abnormal results', `${data.abnormal.length}${hiddenAbnormal ? ` (+${hiddenAbnormal} in LIS feed)` : ''}`],
        ['Generated', `${formatDisplayDate(today)} • MediOS AI (assistive — verify clinically)`],
      ],
      sections: [
        ...data.groups.map((g) => ({
          heading: `${g.name} • ${g.uhid}`,
          bullets: g.samples.map((s) => {
            const sug = suggestFor(s);
            const cite = citationFor(sug, hospitalProtocols);
            const vals = flaggedParams(s)
              .map((p) => `${p.name} ${displayValue(p)} (${parameterFlag(p) === 'H' ? 'High' : 'Low'})`)
              .join(', ');
            return `${s.testName}: ${vals || s.flag || 'Abnormal'}. Suggested: ${sug.action}${cite ? ` [${cite}]` : ''} — ordered by ${s.orderedBy ?? '—'}`;
          }),
        })),
        { heading: 'Turnaround', paragraphs: [tatLine, awaitingLine] },
      ],
      signatory: 'Vishnu Prasad',
      signatoryRole: 'Lab Technician',
      hospital: letterhead(hospitalProfile),
    };
    await exportDocument(spec, `Lab AI Summary ${today}.pdf`, 'share');
    setExporting(false);
  };

  const footer = loading ? null : (
    <View style={styles.footerRow}>
      <Button
        title="Export PDF"
        variant="outline"
        onPress={exportPdf}
        loading={exporting}
        disabled={exporting}
        style={styles.flex}
        icon={<Ionicons name="download-outline" size={17} color={colors.primary} />}
      />
      <Button
        title="Notify doctors"
        onPress={notify}
        disabled={!data.doctors.length}
        style={styles.flex}
        icon={<Ionicons name="send" size={16} color="#FFFFFF" />}
      />
    </View>
  );

  return (
    <BottomSheet visible={visible} onClose={onClose} title="AI Summary" subtitle="MediOS AI • today's lab results" footer={footer} maxHeight={0.9}>
      {loading ? (
        <View>
          <View style={styles.thinking}>
            <Ionicons name="sparkles" size={16} color={colors.purple} />
            <Text style={styles.thinkingText}>Analyzing today's results</Text>
            <TypingDots color={colors.purple} />
          </View>
          <Skeleton height={64} radius={12} />
          <Skeleton height={16} width="60%" style={{ marginTop: spacing.lg }} />
          <Skeleton height={86} radius={12} style={{ marginTop: spacing.sm }} />
          <Skeleton height={86} radius={12} style={{ marginTop: spacing.sm }} />
        </View>
      ) : (
        <View>
          <FadeInView>
            <LinearGradient colors={['#7C3AED', '#4F46E5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
              <Text style={styles.heroTitle}>
                {data.abnormal.length
                  ? `${data.abnormal.length} abnormal result${data.abnormal.length > 1 ? 's' : ''} across ${data.groups.length} patient${data.groups.length > 1 ? 's' : ''}`
                  : 'No abnormal results in today’s worklist'}
              </Text>
              <Text style={styles.heroSub}>
                {criticalCount ? `${criticalCount} need${criticalCount === 1 ? 's' : ''} urgent review • ` : ''}Pipeline: {labPipeline.New} new • {labPipeline.Processing} processing • {labPipeline.Completed} completed • {labPipeline.Abnormal} abnormal
              </Text>
              {hiddenAbnormal > 0 && (
                <Text style={styles.heroNote}>
                  +{hiddenAbnormal} further abnormal result{hiddenAbnormal > 1 ? 's are' : ' is'} on other LIS benches and not itemised here.
                </Text>
              )}
            </LinearGradient>
          </FadeInView>

          {data.groups.map((g, gi) => (
            <FadeInView key={g.key} delay={stagger(gi + 1, 80)}>
              <View style={styles.group}>
                <View style={styles.groupHead}>
                  <Text style={styles.groupName} numberOfLines={1}>
                    {g.name}
                  </Text>
                  <Text style={styles.groupUhid}>{g.uhid}</Text>
                </View>
                {g.samples.map((s) => {
                  const sug = suggestFor(s);
                  const cite = citationFor(sug, hospitalProtocols);
                  const crit = isCritical(s);
                  return (
                    <View key={s.id} style={styles.item}>
                      <View style={styles.itemTop}>
                        <Text style={styles.test} numberOfLines={1}>
                          {s.testName}
                        </Text>
                        <View style={[styles.sev, crit ? styles.sevCrit : styles.sevWarn]}>
                          <Text style={[styles.sevText, { color: crit ? colors.danger : colors.warningText }]}>{crit ? 'Urgent' : 'Review'}</Text>
                        </View>
                      </View>
                      <View style={styles.params}>
                        {flaggedParams(s).map((p) => (
                          <View key={p.name} style={styles.paramChip}>
                            <Ionicons name={parameterFlag(p) === 'H' ? 'arrow-up' : 'arrow-down'} size={10} color={colors.danger} />
                            <Text style={styles.paramText}>
                              {p.name} {displayValue(p)}
                            </Text>
                          </View>
                        ))}
                        {!flaggedParams(s).length && !!s.flag && <Text style={styles.paramText}>{s.flag}</Text>}
                      </View>
                      <Text style={styles.action}>
                        <Text style={styles.actionLabel}>Suggested: </Text>
                        {sug.action}
                      </Text>
                      <View style={styles.citeRow}>
                        {cite && (
                          <View style={styles.cite}>
                            <Ionicons name="book-outline" size={11} color={colors.purple} />
                            <Text style={styles.citeText} numberOfLines={2}>
                              {cite}
                            </Text>
                          </View>
                        )}
                        <Text style={styles.ordered}>
                          {s.sampleCode} • {s.orderedBy ?? '—'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </FadeInView>
          ))}

          <FadeInView delay={stagger(data.groups.length + 1, 80)}>
            <View style={styles.tat}>
              <Ionicons name="timer-outline" size={16} color={colors.textSecondary} />
              <View style={styles.flex}>
                <Text style={styles.tatTitle}>Turnaround</Text>
                <Text style={styles.tatText}>{tatLine}</Text>
                <Text style={styles.tatText}>{awaitingLine}</Text>
              </View>
            </View>
            <Text style={styles.disclaimer}>AI-generated from verified LIS data. Suggestions support — never replace — the treating doctor's judgement.</Text>
          </FadeInView>
        </View>
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  thinking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  thinkingText: {
    fontSize: typography.fontSizes.sm,
    color: colors.purple,
    fontWeight: typography.fontWeights.semiBold,
  },
  hero: {
    borderRadius: radius.lg,
    padding: spacing.base,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: typography.fontSizes.md + 1,
    fontWeight: typography.fontWeights.bold,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: typography.fontSizes.xs + 1,
    marginTop: 4,
    lineHeight: 17,
  },
  heroNote: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: typography.fontSizes.xs,
    marginTop: 6,
    lineHeight: 15,
  },
  group: {
    marginTop: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.purpleLight,
  },
  groupName: {
    flex: 1,
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  groupUhid: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  item: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  test: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  sev: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  sevCrit: { backgroundColor: colors.dangerLight },
  sevWarn: { backgroundColor: colors.warningLight },
  sevText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  params: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  paramChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.dangerLight,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  paramText: {
    fontSize: typography.fontSizes.xs,
    color: colors.dangerText,
    fontWeight: typography.fontWeights.semiBold,
  },
  action: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.text,
    lineHeight: 17,
    marginTop: 8,
  },
  actionLabel: {
    fontWeight: typography.fontWeights.bold,
    color: colors.purple,
  },
  citeRow: {
    marginTop: 6,
    gap: 4,
  },
  cite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  citeText: {
    flex: 1,
    fontSize: 10.5,
    color: colors.purple,
    fontWeight: typography.fontWeights.medium,
  },
  ordered: {
    fontSize: 10.5,
    color: colors.textMuted,
  },
  tat: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.cardMuted,
  },
  tatTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: 2,
  },
  tatText: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    lineHeight: 17,
    marginTop: 2,
  },
  disclaimer: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: spacing.md,
    lineHeight: 15,
  },
});
