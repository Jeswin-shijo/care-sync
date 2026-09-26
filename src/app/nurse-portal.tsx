import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import type { NurseTask, Patient, VitalsRecord, WardInfo } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { VitalFlag, vitalsFlags } from '../logic/clinical';
import { clockToMinutes } from '../utils/dates';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { Badge } from '../components/common/Badge';
import { Avatar } from '../components/common/Avatar';
import { EmptyState } from '../components/common/EmptyState';
import { SectionHeader } from '../components/common/SectionHeader';
import { AnimatedNumber, FadeInView, PressableScale, ProgressFill, PulseDot, stagger } from '../components/common/Motion';
import { AnimatedCheckbox } from '../components/portals/AnimatedCheckbox';
import { CardAction } from '../components/portals/CardAction';
import { CountTabs } from '../components/portals/CountTabs';
import { ExitCollapse } from '../components/portals/ExitCollapse';
import { VitalsFormSheet } from '../components/portals/VitalsFormSheet';
import { durationLabel, minutesOfDay, minutesSince, timeAgoLabel, useNow } from '../components/portals/useNow';

type TaskFilter = 'All' | 'Pending' | 'Completed';
type IconName = keyof typeof Ionicons.glyphMap;

const CATEGORY_ICON: Record<NurseTask['category'], IconName> = {
  Vitals: 'pulse',
  Medication: 'medkit-outline',
  'ICU Follow-up': 'heart-circle-outline',
  Discharge: 'log-out-outline',
};
const PRIORITY_VARIANT = { High: 'danger', Medium: 'warning', Low: 'info' } as const;
const WARD_ICON: Record<WardInfo['type'], IconName> = { ICU: 'heart', Deluxe: 'star', General: 'bed' };
/** Observations are due every 4 hours on the ward. */
const OBS_INTERVAL_MIN = 240;

export default function NursePortalRoute() {
  const { setActiveRole, bedSummary, wardInfo, nurseTasks, toggleNurseTask, patients, getLatestVitals } = useApp();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const now = useNow(30000);
  const nowMin = minutesOfDay(now);

  const [filter, setFilter] = useState<TaskFilter>('All');
  const [exiting, setExiting] = useState<Record<string, true>>({});
  const [sheet, setSheet] = useState<{ open: boolean; patientId: string | null }>({ open: false, patientId: null });

  // Re-asserted on every focus, so returning to this portal restores its role.
  useFocusEffect(
    useCallback(() => {
      setActiveRole('nurse');
    }, [setActiveRole])
  );

  const tasks = useMemo(() => [...nurseTasks].sort((a, b) => clockToMinutes(a.timeDue) - clockToMinutes(b.timeDue)), [nurseTasks]);
  const doneCount = tasks.filter((t) => t.completed).length;
  const pendingCount = tasks.length - doneCount;
  const overdueCount = tasks.filter((t) => !t.completed && clockToMinutes(t.timeDue) < nowMin).length;
  const visibleTasks = tasks.filter(
    (t) => filter === 'All' || exiting[t.id] || (filter === 'Pending' ? !t.completed : t.completed)
  );

  const admitted = useMemo(() => {
    const rank = (p: Patient) => {
      const v = getLatestVitals(p.id);
      const f = v ? vitalsFlags(v) : [];
      return f.some((x) => x.severity === 'critical') ? 0 : f.length ? 1 : 2;
    };
    return patients.filter((p) => p.status === 'Admitted').sort((a, b) => rank(a) - rank(b) || (a.room ?? '').localeCompare(b.room ?? ''));
  }, [patients, getLatestVitals]);

  const openVitals = (patientId: string | null) => setSheet({ open: true, patientId });

  const changeFilter = (f: TaskFilter) => {
    setExiting({});
    setFilter(f);
  };

  const handleToggle = (task: NurseTask) => {
    const completing = !task.completed;
    toggleNurseTask(task.id);
    if (filter !== 'All') setExiting((e) => ({ ...e, [task.id]: true }));
    showToast({
      type: completing ? 'success' : 'info',
      title: completing ? 'Task completed' : 'Task reopened',
      message: `${task.title} • ${task.patientName}`,
      action: { label: 'Undo', onPress: () => toggleNurseTask(task.id) },
    });
  };

  const clearExit = (id: string) =>
    setExiting((e) => {
      const next = { ...e };
      delete next[id];
      return next;
    });

  const occupancyColor = bedSummary.pct >= 90 ? colors.danger : bedSummary.pct >= 80 ? colors.warning : colors.primary;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header
        title="Nurse Portal"
        subtitle="Beds, vitals & shift tasks"
        rightAction={
          <PressableScale style={styles.headerBtn} onPress={() => openVitals(null)} haptic accessibilityRole="button" accessibilityLabel="Log vitals">
            <Ionicons name="pulse" size={16} color="#FFFFFF" />
            <Text style={styles.headerBtnText}>Log Vitals</Text>
          </PressableScale>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxl }]}>
        {/* Ward overview */}
        <FadeInView>
          <SectionHeader title="Ward Overview" meta={`${wardInfo.length} wards • live`} style={styles.firstHeader} />
          <View style={styles.kpiRow}>
            <KpiTile label="Total Beds" value={bedSummary.total} sub={`${wardInfo.length} wards`} color={colors.primaryDark} bg={colors.infoLight} border="#BFDBFE" />
            <KpiTile label="Occupied" value={bedSummary.occupied} sub={`${bedSummary.pct}% full`} color={colors.danger} bg={colors.dangerLight} border="#FECACA" />
            <KpiTile label="Available" value={bedSummary.available} sub={`ICU ${bedSummary.icuAvailable}/${bedSummary.icuTotal} free`} color="#059669" bg={colors.successLight} border="#BBF7D0" />
          </View>
          <View style={styles.occupancy}>
            <View style={styles.occupancyTop}>
              <Text style={styles.occupancyLabel}>Occupancy</Text>
              <Text style={[styles.occupancyPct, { color: occupancyColor }]}>{bedSummary.pct}%</Text>
            </View>
            <ProgressFill progress={bedSummary.total ? bedSummary.occupied / bedSummary.total : 0} color={occupancyColor} height={8} />
          </View>
        </FadeInView>

        <View style={styles.card}>
          {wardInfo.map((w, i) => (
            <FadeInView key={w.id} delay={stagger(i + 1)}>
              <WardRow ward={w} last={i === wardInfo.length - 1} onPress={() => router.push({ pathname: '/bed-management', params: { ward: w.id } })} />
            </FadeInView>
          ))}
        </View>

        {/* Shift tasks */}
        <SectionHeader
          title="Today's Tasks"
          meta={`${doneCount}/${tasks.length} done${overdueCount ? ` • ${overdueCount} overdue` : ''}`}
        />
        <View style={styles.progressCard}>
          <View style={styles.progressTop}>
            <Text style={styles.progressText}>
              <Text style={styles.progressStrong}>{doneCount}</Text> of {tasks.length} tasks done
            </Text>
            {overdueCount > 0 && (
              <View style={styles.overduePill}>
                <PulseDot color={colors.danger} size={6} />
                <Text style={styles.overduePillText}>{overdueCount} overdue</Text>
              </View>
            )}
          </View>
          <ProgressFill progress={tasks.length ? doneCount / tasks.length : 0} color={colors.success} height={8} />
        </View>
        <CountTabs<TaskFilter>
          tabs={[
            { key: 'All', label: 'All', count: tasks.length },
            { key: 'Pending', label: 'Pending', count: pendingCount, tone: overdueCount ? 'danger' : 'warning' },
            { key: 'Completed', label: 'Completed', count: doneCount, tone: 'success' },
          ]}
          active={filter}
          onChange={changeFilter}
          style={styles.tabs}
        />

        <View key={filter}>
          {visibleTasks.map((task, i) => {
            const due = clockToMinutes(task.timeDue);
            return (
              <FadeInView key={task.id} delay={stagger(i)}>
                <ExitCollapse
                  exiting={!!exiting[task.id]}
                  onExited={() => clearExit(task.id)}
                  spacing={spacing.md}
                  overlay={
                    <View style={[styles.exitStamp, { backgroundColor: task.completed ? colors.success + 'E6' : colors.primary + 'E6' }]}>
                      <Ionicons name={task.completed ? 'checkmark-circle' : 'refresh'} size={22} color="#FFFFFF" />
                      <Text style={styles.exitStampText}>{task.completed ? 'Completed' : 'Moved to Pending'}</Text>
                    </View>
                  }
                >
                  <TaskCard
                    task={task}
                    minutesPastDue={nowMin - due}
                    onToggle={() => handleToggle(task)}
                    onRecordVitals={task.category === 'Vitals' && task.patientId ? () => openVitals(task.patientId ?? null) : undefined}
                    onDischarge={task.category === 'Discharge' && task.patientId ? () => router.push({ pathname: '/discharge-summary', params: { patientId: task.patientId } }) : undefined}
                    onOpenChart={task.patientId ? () => router.push({ pathname: '/patient/[id]', params: { id: task.patientId! } }) : undefined}
                  />
                </ExitCollapse>
              </FadeInView>
            );
          })}
          {!visibleTasks.length && (
            <EmptyState
              icon={filter === 'Completed' ? 'checkmark-done-outline' : 'sparkles-outline'}
              title={filter === 'Pending' ? 'All tasks done' : filter === 'Completed' ? 'Nothing completed yet' : 'No tasks this shift'}
              description={filter === 'Pending' ? 'Every task on this shift is complete. Nice work.' : 'Tasks you complete appear here with the time they were done.'}
              style={styles.empty}
            />
          )}
        </View>

        {/* Latest vitals */}
        <SectionHeader title="Latest Vitals" meta={`${admitted.length} admitted`} actionLabel="Log vitals" onActionPress={() => openVitals(null)} />
        {admitted.map((p, i) => (
          <FadeInView key={p.id} delay={stagger(i)}>
            <VitalsCard
              patient={p}
              vitals={getLatestVitals(p.id)}
              now={now}
              onRecord={() => openVitals(p.id)}
              onOpen={() => router.push({ pathname: '/patient/[id]', params: { id: p.id } })}
            />
          </FadeInView>
        ))}
        {!admitted.length && <EmptyState icon="bed-outline" title="No admitted patients" description="Admitted patients and their latest observations appear here." />}
      </ScrollView>

      <VitalsFormSheet
        visible={sheet.open}
        initialPatientId={sheet.patientId}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        onSaved={(record) => {
          // Saving vitals auto-completes that patient's open vitals task — animate it out of a filtered list.
          if (filter === 'All') return;
          const done = nurseTasks.filter((t) => t.patientId === record.patientId && t.category === 'Vitals' && !t.completed);
          if (done.length) setExiting((e) => ({ ...e, ...Object.fromEntries(done.map((t) => [t.id, true as const])) }));
        }}
      />
    </SafeAreaView>
  );
}

// -------------------------------------------------------------

const KpiTile: React.FC<{ label: string; value: number; sub: string; color: string; bg: string; border: string }> = ({ label, value, sub, color, bg, border }) => (
  <View style={[styles.kpi, { backgroundColor: bg, borderColor: border }]} accessible accessibilityLabel={`${label}: ${value}. ${sub}`}>
    <Text style={styles.kpiLabel}>{label}</Text>
    <AnimatedNumber value={value} style={[styles.kpiValue, { color }]} />
    <Text style={styles.kpiSub} numberOfLines={1}>
      {sub}
    </Text>
  </View>
);

const WardRow: React.FC<{ ward: WardInfo; last: boolean; onPress: () => void }> = ({ ward, last, onPress }) => {
  const pct = ward.totalBeds ? ward.occupied / ward.totalBeds : 0;
  const tone = pct >= 0.9 || ward.available <= 1 ? colors.danger : pct >= 0.8 || ward.available <= 3 ? colors.warning : colors.success;
  return (
    <PressableScale
      style={[styles.wardRow, !last && styles.divider]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${ward.name}: ${ward.occupied} occupied, ${ward.available} available. Open bed management`}
    >
      <View style={[styles.wardIcon, ward.type === 'ICU' && { backgroundColor: colors.dangerLight }]}>
        <Ionicons name={WARD_ICON[ward.type]} size={16} color={ward.type === 'ICU' ? colors.danger : colors.primary} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.wardName} numberOfLines={1}>
          {ward.name}
        </Text>
        <Text style={styles.wardMeta}>
          {ward.occupied} occupied • {ward.available} available
        </Text>
        <ProgressFill progress={pct} color={tone} height={4} style={styles.wardBar} />
      </View>
      <Badge label={`${ward.available} free`} variant={tone === colors.success ? 'success' : tone === colors.warning ? 'warning' : 'danger'} size="sm" />
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </PressableScale>
  );
};

interface TaskCardProps {
  task: NurseTask;
  /** Minutes since the task was due (negative = due later today). */
  minutesPastDue: number;
  onToggle: () => void;
  onRecordVitals?: () => void;
  onDischarge?: () => void;
  onOpenChart?: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, minutesPastDue, onToggle, onRecordVitals, onDischarge, onOpenChart }) => {
  const overdue = !task.completed && minutesPastDue > 0;
  const soon = !task.completed && minutesPastDue <= 0 && minutesPastDue > -60;
  return (
    <View style={[styles.taskCard, task.completed && styles.taskDone, overdue && styles.taskOverdue]}>
      <AnimatedCheckbox
        checked={task.completed}
        onToggle={onToggle}
        accessibilityLabel={`${task.title} for ${task.patientName}`}
        style={styles.checkbox}
      />
      <View style={styles.flex}>
        <View style={styles.taskTitleRow}>
          <Text style={[styles.taskTitle, task.completed && styles.taskTitleDone]} numberOfLines={2}>
            {task.title}
          </Text>
          <Badge label={task.priority} variant={PRIORITY_VARIANT[task.priority]} size="sm" />
        </View>
        <Text style={styles.taskPatient} numberOfLines={1}>
          {task.patientName} • {task.ward}
        </Text>
        {!!task.notes && !task.completed && <Text style={styles.taskNotes}>{task.notes}</Text>}
        <View style={styles.taskMeta}>
          <View style={styles.catChip}>
            <Ionicons name={CATEGORY_ICON[task.category]} size={11} color={colors.textSecondary} />
            <Text style={styles.catText}>{task.category}</Text>
          </View>
          {task.completed ? (
            <View style={styles.metaItem}>
              <Ionicons name="checkmark-done" size={13} color={colors.success} />
              <Text style={[styles.metaText, { color: colors.successText }]}>Done{task.completedAt ? ` at ${task.completedAt}` : ''}</Text>
            </View>
          ) : overdue ? (
            <View style={[styles.metaItem, styles.overdueChip]}>
              <Ionicons name="alert-circle" size={12} color={colors.danger} />
              <Text style={[styles.metaText, styles.overdueText]}>
                Overdue {durationLabel(minutesPastDue)} • due {task.timeDue}
              </Text>
            </View>
          ) : (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color={soon ? colors.warning : colors.textMuted} />
              <Text style={[styles.metaText, soon && { color: colors.warningText }]}>
                Due {task.timeDue}
                {soon ? ` • in ${durationLabel(-minutesPastDue)}` : ''}
              </Text>
            </View>
          )}
        </View>
        {!task.completed && (onRecordVitals || onDischarge || onOpenChart) && (
          <View style={styles.taskActions}>
            {onRecordVitals && <CardAction label="Record vitals" icon="pulse" onPress={onRecordVitals} />}
            {onDischarge && <CardAction label="Discharge summary" icon="document-text-outline" variant="outline" onPress={onDischarge} />}
            {onOpenChart && <CardAction label="Chart" icon="person-outline" variant="ghost" onPress={onOpenChart} accessibilityLabel={`Open ${task.patientName}'s chart`} />}
          </View>
        )}
      </View>
    </View>
  );
};

const flagTone = (flags: VitalFlag[], field: VitalFlag['field']) => {
  const f = flags.find((x) => x.field === field);
  return f ? (f.severity === 'critical' ? 'critical' : 'warning') : null;
};

const VitalsCard: React.FC<{ patient: Patient; vitals?: VitalsRecord; now: Date; onRecord: () => void; onOpen: () => void }> = ({
  patient,
  vitals,
  now,
  onRecord,
  onOpen,
}) => {
  const flags = vitals ? vitalsFlags(vitals) : [];
  const critical = flags.some((f) => f.severity === 'critical');
  const since = vitals ? minutesSince(vitals.date, vitals.time, now) : null;
  const obsDue = !vitals || since === null || since > OBS_INTERVAL_MIN;
  const chips: Array<{ field: VitalFlag['field']; text: string }> = vitals
    ? [
        { field: 'bp', text: `BP ${vitals.bp}` },
        { field: 'pulse', text: `P ${vitals.pulse}` },
        { field: 'spo2', text: `SpO₂ ${vitals.spo2}%` },
        { field: 'temp', text: `${vitals.temp}°F` },
        ...(typeof vitals.respRate === 'number' ? [{ field: 'respRate' as const, text: `RR ${vitals.respRate}` }] : []),
        ...(typeof vitals.sugar === 'number' ? [{ field: 'sugar' as const, text: `Glu ${vitals.sugar}` }] : []),
      ]
    : [];
  return (
    <PressableScale
      style={[styles.vitalsCard, critical && styles.vitalsCritical]}
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${patient.name}, ${patient.room ?? ''}. ${flags.length ? `${flags.length} abnormal vitals` : 'vitals stable'}. Open chart`}
    >
      <View style={styles.vitalsTop}>
        <Avatar name={patient.name} size={40} />
        <View style={styles.flex}>
          <Text style={styles.vitalsName} numberOfLines={1}>
            {patient.name}
          </Text>
          <Text style={styles.vitalsRoom} numberOfLines={1}>
            {patient.room ?? patient.uhid}
            {patient.attendingDoctor ? ` • ${patient.attendingDoctor}` : ''}
          </Text>
        </View>
        {vitals ? (
          flags.length ? (
            <Badge label={`${flags.length} flag${flags.length > 1 ? 's' : ''}`} variant={critical ? 'danger' : 'warning'} size="sm" />
          ) : (
            <Badge label="Stable" variant="success" size="sm" />
          )
        ) : null}
      </View>
      {vitals ? (
        <>
          <View style={styles.chips}>
            {chips.map((c) => {
              const tone = flagTone(flags, c.field);
              return (
                <View key={c.field} style={[styles.vChip, tone === 'critical' ? styles.vChipCrit : tone === 'warning' ? styles.vChipWarn : null]}>
                  {tone && <Ionicons name="alert-circle" size={11} color={tone === 'critical' ? colors.danger : colors.warning} />}
                  <Text style={[styles.vChipText, tone === 'critical' ? { color: colors.danger } : tone === 'warning' ? { color: colors.warningText } : null]}>{c.text}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.vitalsFoot}>
            <Ionicons name="time-outline" size={12} color={obsDue ? colors.warning : colors.textMuted} />
            <Text style={[styles.vitalsWhen, obsDue && { color: colors.warningText }]} numberOfLines={1}>
              {timeAgoLabel(vitals.date, vitals.time, now)} • {vitals.recordedBy}
              {obsDue ? ' • obs due' : ''}
            </Text>
            <CardAction label="Record" icon="add" variant={obsDue || critical ? 'primary' : 'outline'} onPress={onRecord} accessibilityLabel={`Record vitals for ${patient.name}`} />
          </View>
        </>
      ) : (
        <View style={styles.vitalsFoot}>
          <Ionicons name="alert-circle-outline" size={13} color={colors.warning} />
          <Text style={[styles.vitalsWhen, { color: colors.warningText }]}>No vitals recorded yet</Text>
          <CardAction label="Record now" icon="add" onPress={onRecord} accessibilityLabel={`Record vitals for ${patient.name}`} />
        </View>
      )}
    </PressableScale>
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
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    minHeight: 38,
    borderRadius: radius.full,
  },
  headerBtnText: {
    color: '#FFFFFF',
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.bold,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  kpi: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.semiBold,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: typography.fontWeights.extraBold,
    marginVertical: 2,
  },
  kpiSub: {
    fontSize: 10.5,
    color: colors.textMuted,
  },
  occupancy: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  occupancyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  occupancyLabel: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.semiBold,
  },
  occupancyPct: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.bold,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    ...shadows.sm,
  },
  wardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  wardIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wardName: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  wardMeta: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  wardBar: {
    marginTop: 6,
  },
  progressCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  progressTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  progressText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  progressStrong: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.text,
  },
  overduePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  overduePillText: {
    fontSize: typography.fontSizes.xs,
    color: colors.danger,
    fontWeight: typography.fontWeights.bold,
  },
  tabs: {
    marginBottom: spacing.md,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
    paddingLeft: spacing.xs,
    ...shadows.sm,
  },
  taskDone: {
    backgroundColor: '#FBFCFE',
  },
  taskOverdue: {
    borderColor: colors.danger + '66',
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  checkbox: {
    marginTop: -10,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  taskTitle: {
    flex: 1,
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  taskPatient: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
  },
  taskNotes: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
    lineHeight: 16,
  },
  taskMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.cardMuted,
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  catText: {
    fontSize: 10.5,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.semiBold,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.medium,
  },
  overdueChip: {
    backgroundColor: colors.dangerLight,
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  overdueText: {
    color: colors.danger,
    fontWeight: typography.fontWeights.bold,
  },
  taskActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  exitStamp: {
    flex: 1,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  exitStampText: {
    color: '#FFFFFF',
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
  },
  empty: {
    paddingVertical: spacing.lg,
  },
  vitalsCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  vitalsCritical: {
    borderColor: colors.danger + '55',
  },
  vitalsTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  vitalsName: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  vitalsRoom: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.md,
  },
  vChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.cardMuted,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  vChipWarn: {
    backgroundColor: colors.warningLight,
  },
  vChipCrit: {
    backgroundColor: colors.dangerLight,
  },
  vChipText: {
    fontSize: typography.fontSizes.xs + 0.5,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  vitalsFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  vitalsWhen: {
    flex: 1,
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
});
