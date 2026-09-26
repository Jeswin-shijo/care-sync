import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import type { LabSample } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { exportDocument } from '../utils/pdfGenerator';
import { todayISO } from '../utils/dates';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { Badge, statusVariant } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { SectionHeader } from '../components/common/SectionHeader';
import { AnimatedNumber, FadeInView, PressableScale, PulseDot, stagger } from '../components/common/Motion';
import { AiSummarySheet } from '../components/portals/AiSummarySheet';
import { CardAction } from '../components/portals/CardAction';
import { CountTabs } from '../components/portals/CountTabs';
import { ExitCollapse } from '../components/portals/ExitCollapse';
import { ParamTable } from '../components/portals/ParamTable';
import { ResultEntrySheet } from '../components/portals/ResultEntrySheet';
import { SampleStepper } from '../components/portals/SampleStepper';
import { labReportSpec } from '../components/portals/documents';

type Status = LabSample['status'];
type Filter = 'All' | Status;
type IconName = keyof typeof Ionicons.glyphMap;

const STATUSES: Status[] = ['New', 'Processing', 'Completed', 'Abnormal'];
const KPI: Record<Status, { label: string; sub: string; icon: IconName; color: string; bg: string }> = {
  New: { label: 'New Samples', sub: 'Awaiting receipt', icon: 'albums-outline', color: colors.primary, bg: colors.primaryLight },
  Processing: { label: 'Processing', sub: 'In analyzers', icon: 'sync-outline', color: colors.warning, bg: colors.warningLight },
  Completed: { label: 'Completed', sub: 'Verified & signed', icon: 'checkmark-done-outline', color: colors.success, bg: colors.successLight },
  Abnormal: { label: 'Abnormal Results', sub: 'Doctor alerted', icon: 'alert-circle-outline', color: colors.danger, bg: colors.dangerLight },
};
const EXIT_LABEL: Record<Status, string> = {
  New: 'Back to New',
  Processing: 'Moved to Processing',
  Completed: 'Released • Completed',
  Abnormal: 'Released • Abnormal',
};

export default function LabPortalRoute() {
  const { setActiveRole, labSamples, labPipeline, receiveSample, hospitalProfile, getPatient } = useApp();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>('All');
  const [exiting, setExiting] = useState<Record<string, true>>({});
  const [entry, setEntry] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);

  // Re-asserted on every focus, so returning to this portal restores its role.
  useFocusEffect(
    useCallback(() => {
      setActiveRole('lab');
    }, [setActiveRole])
  );

  const today = todayISO();
  // Today's worklist plus anything older that is still pending; history stays out of the queue.
  const queue = useMemo(
    () =>
      labSamples
        .filter((s) => s.date === today || s.status === 'New' || s.status === 'Processing')
        .sort((a, b) => (a.sampleCode < b.sampleCode ? 1 : -1)),
    [labSamples, today]
  );
  const counts = useMemo(() => {
    const c: Record<Status, number> = { New: 0, Processing: 0, Completed: 0, Abnormal: 0 };
    queue.forEach((s) => (c[s.status] += 1));
    return c;
  }, [queue]);
  const visible = queue.filter((s) => filter === 'All' || s.status === filter || exiting[s.id]);
  const pipelineTotal = STATUSES.reduce((n, k) => n + labPipeline[k], 0);
  const hiddenInLis = Math.max(0, (filter === 'All' ? pipelineTotal : labPipeline[filter]) - (filter === 'All' ? queue.length : counts[filter]));
  const abnormalToday = queue.filter((s) => s.status === 'Abnormal').length;
  const entrySample = labSamples.find((s) => s.id === entry.id) ?? null;

  const changeFilter = (f: Filter) => {
    setExiting({});
    setFilter((prev) => (prev === f && f !== 'All' ? 'All' : f));
  };

  const markExit = (id: string) => {
    if (filter !== 'All') setExiting((e) => ({ ...e, [id]: true }));
  };
  const clearExit = (id: string) =>
    setExiting((e) => {
      const next = { ...e };
      delete next[id];
      return next;
    });

  const handleReceive = (s: LabSample) => {
    const updated = receiveSample(s.id);
    if (!updated || updated.status !== 'Processing') {
      showToast({ type: 'info', message: `${s.sampleCode} was already received.` });
      return;
    }
    markExit(s.id);
    showToast({
      type: 'success',
      title: 'Sample received',
      message: `${s.sampleCode} • ${s.patientName} → analyzer queue at ${updated.collectedAt}`,
      action: filter === 'New' ? { label: 'View', onPress: () => changeFilter('Processing') } : undefined,
    });
  };

  const handleReleased = (s: LabSample) => {
    markExit(s.id);
    const abnormal = s.status === 'Abnormal';
    showToast({
      type: abnormal ? 'warning' : 'success',
      title: abnormal ? 'Abnormal result released' : 'Result released',
      message: `${s.sampleCode} • ${s.patientName}${abnormal ? ` • ${s.orderedBy ?? 'ordering doctor'} alerted` : ' • report ready for the doctor & patient'}`,
      action: s.patientId
        ? { label: 'Copilot', onPress: () => router.push({ pathname: '/doctor-copilot', params: { patientId: s.patientId!, tab: 'Reports' } }) }
        : undefined,
      duration: 4000,
    });
  };

  const share = async (s: LabSample) => {
    setSharingId(s.id);
    await exportDocument(labReportSpec(s, hospitalProfile, { patient: getPatient(s.patientId) }), `Lab Report ${s.sampleCode}.pdf`, 'share');
    setSharingId(null);
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header title="Lab Portal" subtitle="Sample tracking & AI report summary" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxl }]}>
        <FadeInView>
          <SectionHeader title="Lab Dashboard" meta="today" style={styles.firstHeader} />
          <View style={styles.dashboard}>
            <View style={styles.kpiGrid}>
              {STATUSES.map((k) => {
                const cfg = KPI[k];
                const active = filter === k;
                return (
                  <PressableScale
                    key={k}
                    style={[styles.kpi, active && { borderColor: cfg.color, backgroundColor: cfg.bg }]}
                    onPress={() => changeFilter(k)}
                    haptic
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${cfg.label}: ${labPipeline[k]}. ${active ? 'Showing only these; tap to show all' : 'Tap to filter'}`}
                  >
                    <View style={styles.kpiTop}>
                      <View style={[styles.kpiIcon, { backgroundColor: cfg.bg }]}>
                        <Ionicons name={cfg.icon} size={16} color={cfg.color} />
                      </View>
                      {k === 'Abnormal' && labPipeline.Abnormal > 0 && <PulseDot color={colors.danger} size={7} />}
                    </View>
                    <AnimatedNumber value={labPipeline[k]} style={[styles.kpiValue, { color: cfg.color }]} />
                    <Text style={styles.kpiLabel} numberOfLines={1}>
                      {cfg.label}
                    </Text>
                    <Text style={styles.kpiSub} numberOfLines={1}>
                      {active ? 'Filtered • tap to reset' : cfg.sub}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
            <PressableScale onPress={() => setSummaryOpen(true)} haptic accessibilityRole="button" accessibilityLabel="Open AI summary of today's results">
              <LinearGradient colors={['#7C3AED', '#4F46E5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aiBtn}>
                <View style={styles.aiIcon}>
                  <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.aiTitle}>AI Summary</Text>
                  <Text style={styles.aiSub} numberOfLines={1}>
                    {abnormalToday ? `${abnormalToday} abnormal in today's worklist • suggested actions` : "Summarise today's results"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
              </LinearGradient>
            </PressableScale>
          </View>
        </FadeInView>

        <SectionHeader title="Sample Queue" meta={`${visible.length} shown`} />
        <CountTabs<Filter>
          scrollable
          tabs={[
            { key: 'All', label: 'All', count: queue.length },
            { key: 'New', label: 'New', count: counts.New },
            { key: 'Processing', label: 'Processing', count: counts.Processing, tone: 'warning' },
            { key: 'Completed', label: 'Completed', count: counts.Completed, tone: 'success' },
            { key: 'Abnormal', label: 'Abnormal', count: counts.Abnormal, tone: 'danger' },
          ]}
          active={filter}
          onChange={(f) => changeFilter(f)}
          style={styles.tabs}
        />

        <View key={filter}>
          {visible.map((s, i) => (
            <FadeInView key={s.id} delay={stagger(i)}>
              <ExitCollapse
                exiting={!!exiting[s.id]}
                onExited={() => clearExit(s.id)}
                spacing={spacing.md}
                overlay={
                  <View style={[styles.exitStamp, { backgroundColor: (s.status === 'Abnormal' ? colors.danger : s.status === 'Processing' ? colors.warning : colors.success) + 'E6' }]}>
                    <Ionicons name={s.status === 'Processing' ? 'sync' : 'checkmark-circle'} size={22} color="#FFFFFF" />
                    <Text style={styles.exitText}>{EXIT_LABEL[s.status]}</Text>
                  </View>
                }
              >
                <SampleCard
                  sample={s}
                  sharing={sharingId === s.id}
                  onReceive={() => handleReceive(s)}
                  onEnter={() => setEntry({ open: true, id: s.id })}
                  onShare={() => share(s)}
                  onCopilot={
                    s.patientId ? () => router.push({ pathname: '/doctor-copilot', params: { patientId: s.patientId!, tab: 'Reports' } }) : undefined
                  }
                />
              </ExitCollapse>
            </FadeInView>
          ))}
          {!visible.length && (
            <EmptyState
              icon="flask-outline"
              title={filter === 'All' ? 'Worklist is empty' : `No ${filter.toLowerCase()} samples in this worklist`}
              description={filter === 'New' ? 'New lab orders appear here as soon as a doctor orders them.' : 'Try another filter.'}
              actionTitle={filter !== 'All' ? 'Show all samples' : undefined}
              onActionPress={filter !== 'All' ? () => changeFilter('All') : undefined}
              style={styles.empty}
            />
          )}
          {hiddenInLis > 0 && (
            <View style={styles.lisNote}>
              <Ionicons name="server-outline" size={15} color={colors.textSecondary} />
              <Text style={styles.lisText}>
                +{hiddenInLis} more {filter === 'All' ? '' : `${filter.toLowerCase()} `}sample{hiddenInLis > 1 ? 's' : ''} in the LIS from other benches — counted in the dashboard, not listed on this device.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <ResultEntrySheet
        visible={entry.open}
        sample={entrySample}
        onClose={() => setEntry((e) => ({ ...e, open: false }))}
        onReleased={handleReleased}
      />
      <AiSummarySheet visible={summaryOpen} onClose={() => setSummaryOpen(false)} />
    </SafeAreaView>
  );
}

// -------------------------------------------------------------

interface SampleCardProps {
  sample: LabSample;
  sharing: boolean;
  onReceive: () => void;
  onEnter: () => void;
  onShare: () => void;
  onCopilot?: () => void;
}

const SampleCard: React.FC<SampleCardProps> = ({ sample: s, sharing, onReceive, onEnter, onShare, onCopilot }) => {
  const done = s.status === 'Completed' || s.status === 'Abnormal';
  const abnormal = s.status === 'Abnormal';
  return (
    <View style={[styles.card, abnormal && styles.cardAbnormal]}>
      <View style={styles.cardTop}>
        <View style={styles.flex}>
          <Text style={styles.code}>{s.sampleCode}</Text>
          <Text style={styles.patient} numberOfLines={1}>
            {s.patientName} • {s.uhid}
          </Text>
        </View>
        <View style={styles.statusWrap}>
          {abnormal && <PulseDot color={colors.danger} size={7} />}
          <Badge label={s.status} variant={statusVariant(s.status)} size="sm" />
        </View>
      </View>

      <View style={styles.testRow}>
        <Ionicons name="flask" size={15} color={colors.primary} />
        <Text style={styles.testName} numberOfLines={2}>
          {s.testName}
        </Text>
        <Text style={styles.category}>{s.category}</Text>
      </View>
      {!!s.orderedBy && <Text style={styles.ordered}>Ordered by {s.orderedBy}</Text>}

      <View style={styles.stepper}>
        <SampleStepper sample={s} />
      </View>

      {done ? (
        <>
          {s.parameters?.length ? (
            <ParamTable parameters={s.parameters} />
          ) : s.resultValue ? (
            <View style={styles.resultBox}>
              <Text style={styles.resultText}>{s.resultValue}</Text>
            </View>
          ) : null}
          {abnormal && !!s.flag && (
            <View style={styles.flagBanner}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.flagText}>{s.flag}</Text>
            </View>
          )}
          <View style={styles.actions}>
            <CardAction label="Share report" icon="share-social-outline" variant="outline" onPress={onShare} loading={sharing} grow />
            {onCopilot && <CardAction label="View in Copilot" icon="sparkles-outline" variant="purple" onPress={onCopilot} grow />}
          </View>
        </>
      ) : (
        <View style={styles.pendingRow}>
          <View style={styles.flex}>
            <Text style={styles.pendingLabel}>{s.status === 'New' ? 'Awaiting sample' : 'In analyzer'}</Text>
            <Text style={styles.pendingSub} numberOfLines={2}>
              {s.status === 'New' ? s.turnaroundTime : `Collected ${s.collectedAt} • ${s.turnaroundTime}`}
            </Text>
          </View>
          {s.status === 'New' ? (
            <CardAction label="Receive sample" icon="download-outline" onPress={onReceive} accessibilityLabel={`Receive sample ${s.sampleCode}`} />
          ) : (
            <CardAction label="Enter results" icon="create-outline" variant="success" onPress={onEnter} accessibilityLabel={`Enter results for ${s.sampleCode}`} />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
  },
  flex: { flex: 1 },
  firstHeader: {
    marginTop: spacing.md,
  },
  dashboard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.sm,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  kpi: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    backgroundColor: colors.background,
    padding: spacing.md,
    minHeight: 104,
  },
  kpiTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: typography.fontWeights.extraBold,
    marginTop: 6,
  },
  kpiLabel: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  kpiSub: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 1,
  },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  aiIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTitle: {
    color: '#FFFFFF',
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
  },
  aiSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: typography.fontSizes.xs,
    marginTop: 1,
  },
  tabs: {
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    ...shadows.sm,
  },
  cardAbnormal: {
    borderColor: colors.danger + '55',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  code: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.primary,
    letterSpacing: 0.2,
  },
  patient: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: typography.fontWeights.medium,
  },
  statusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  testRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  testName: {
    flex: 1,
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  category: {
    fontSize: 10.5,
    color: '#0284C7',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.xs,
    fontWeight: typography.fontWeights.semiBold,
    overflow: 'hidden',
  },
  ordered: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 3,
  },
  stepper: {
    marginVertical: spacing.md,
  },
  resultBox: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  resultText: {
    fontSize: typography.fontSizes.sm,
    color: colors.text,
    fontWeight: typography.fontWeights.semiBold,
  },
  flagBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginTop: spacing.sm,
  },
  flagText: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.dangerText,
    lineHeight: 17,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  pendingLabel: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  pendingSub: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  exitStamp: {
    flex: 1,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  exitText: {
    color: '#FFFFFF',
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
  },
  empty: {
    paddingVertical: spacing.lg,
  },
  lisNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  lisText: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    lineHeight: 16,
  },
});
