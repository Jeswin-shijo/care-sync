import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Linking, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import type { Appointment, Patient } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { SearchBar } from '../components/common/SearchBar';
import { Avatar } from '../components/common/Avatar';
import { Badge, statusVariant } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { BottomSheet } from '../components/common/BottomSheet';
import { AnimatedNumber, FadeInView, PressableScale, PulseDot, stagger } from '../components/common/Motion';
import { KeyboardAwareContainer, formScrollProps, useKeyboardHeight } from '../components/common/KeyboardAware';
import { WeekStrip, StripDay } from '../components/orders/WeekStrip';
import { CountTabs } from '../components/orders/CountTabs';
import { HeaderActions, HeaderIconButton } from '../components/orders/HeaderIconButton';
import { plural, useMinuteTick } from '../components/orders/hooks';
import { RoleLockScreen } from '../components/orders/RoleLock';
import { canAccess } from '../logic/access';
import {
  clockToMinutes,
  daysFromToday,
  formatClock,
  formatDayMonth,
  formatDisplayDate,
  fromISODate,
  isoDaysFromToday,
  todayISO,
  weekdayShort,
} from '../utils/dates';

type TypeTab = 'All' | Appointment['type'];
const TYPE_TABS: TypeTab[] = ['All', 'OPD', 'IPD', 'Follow Up'];

type Row = { kind: 'apt'; apt: Appointment; index: number } | { kind: 'now'; key: string };

type ActionKey = 'checkin' | 'start' | 'continue' | 'complete' | 'noshow' | 'cancel' | 'call' | 'profile' | 'rebook' | 'directions';
interface SheetAction {
  key: ActionKey;
  label: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
}

const TONE_COLOR: Record<SheetAction['tone'], { fg: string; bg: string }> = {
  primary: { fg: colors.primary, bg: colors.primaryLight },
  success: { fg: colors.success, bg: colors.successLight },
  warning: { fg: colors.warning, bg: colors.warningLight },
  danger: { fg: colors.danger, bg: colors.dangerLight },
  neutral: { fg: colors.textSecondary, bg: colors.cardMuted },
};

const isValidISO = (v?: string): v is string => !!v && !!fromISODate(v);

/** "Today, 26 Sep" / "Tomorrow, 27 Sep" / "Mon, 28 Sep". */
const dayTitle = (iso: string) => {
  const diff = daysFromToday(iso);
  const rel = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff === -1 ? 'Yesterday' : weekdayShort(iso);
  return `${rel}, ${formatDayMonth(iso)}`;
};

const byTime = (a: Appointment, b: Appointment) => clockToMinutes(a.time) - clockToMinutes(b.time) || a.tokenNo - b.tokenNo;

/** Only the transitions that make sense for this appointment right now. */
const actionsFor = (apt: Appointment, dayOffset: number, nowMinutes: number, hasPhone: boolean): SheetAction[] => {
  const today = dayOffset === 0;
  const past = dayOffset < 0;
  const ipd = apt.type === 'IPD';
  const timePassed = past || (today && clockToMinutes(apt.time) < nowMinutes);
  const start: SheetAction = ipd
    ? { key: 'start', label: 'Start bedside review', sub: 'Marks In Consultation and opens the patient record', icon: 'play-circle-outline', tone: 'primary' }
    : { key: 'start', label: 'Start consultation', sub: 'Marks In Consultation and opens OPD notes', icon: 'play-circle-outline', tone: 'primary' };
  const complete: SheetAction = { key: 'complete', label: 'Mark completed', sub: 'Visit is finished', icon: 'checkmark-done-outline', tone: 'success' };
  const noShow: SheetAction = { key: 'noshow', label: 'Mark no-show', sub: 'Patient did not arrive', icon: 'person-remove-outline', tone: 'warning' };
  const cancel: SheetAction = { key: 'cancel', label: 'Cancel appointment', sub: 'Releases the slot for other patients', icon: 'close-circle-outline', tone: 'danger' };
  const list: SheetAction[] = [];

  switch (apt.status) {
    case 'Confirmed':
      if (today) {
        if (!ipd) list.push({ key: 'checkin', label: 'Check in', sub: 'Patient has arrived — add to the waiting queue', icon: 'log-in-outline', tone: 'primary' });
        list.push(start);
        if (timePassed) list.push(noShow);
      } else if (past) {
        list.push(complete, noShow);
      }
      list.push(cancel);
      break;
    case 'Not Arrived':
      if (today) list.push({ key: 'checkin', label: 'Check in (late arrival)', sub: 'Patient has arrived — add to the waiting queue', icon: 'log-in-outline', tone: 'primary' });
      if (past) list.push(complete);
      list.push(cancel);
      break;
    case 'Waiting':
      if (!dayOffset || past) list.push(start);
      if (past) list.push(complete);
      list.push(cancel);
      break;
    case 'In Consultation':
      list.push(
        { ...start, key: 'continue', label: ipd ? 'Open patient record' : 'Continue consultation', sub: ipd ? 'Resume the bedside review' : 'Resume the OPD notes' },
        complete
      );
      break;
    case 'Completed':
      list.push({ key: 'rebook', label: 'Book follow-up', sub: `Schedule again with ${apt.doctorName}`, icon: 'calendar-outline', tone: 'primary' });
      break;
    case 'Cancelled':
      list.push({ key: 'rebook', label: 'Book again', sub: `Pick a new slot with ${apt.doctorName}`, icon: 'calendar-outline', tone: 'primary' });
      break;
  }
  if (hasPhone && !past && apt.status !== 'Completed' && apt.status !== 'Cancelled') {
    list.push({ key: 'call', label: 'Call patient', sub: 'Remind or confirm the visit', icon: 'call-outline', tone: 'neutral' });
  }
  list.push({ key: 'profile', label: 'View patient record', sub: 'History, vitals, bills and reports', icon: 'person-outline', tone: 'neutral' });
  return list;
};

/** Patient app: a patient can cancel an upcoming visit, rebook, or find the room — nothing clinical. */
const patientActionsFor = (apt: Appointment, dayOffset: number): SheetAction[] => {
  const list: SheetAction[] = [];
  const upcoming = dayOffset >= 0 && (apt.status === 'Confirmed' || apt.status === 'Not Arrived');
  if (upcoming || apt.status === 'Waiting') {
    list.push({ key: 'directions', label: 'Get directions', sub: `Find ${apt.department} OPD in the hospital`, icon: 'navigate-outline', tone: 'primary' });
  }
  if (upcoming) {
    list.push({ key: 'cancel', label: 'Cancel appointment', sub: 'Frees the slot for someone else', icon: 'close-circle-outline', tone: 'danger' });
  }
  if (apt.status === 'Completed' || apt.status === 'Cancelled') {
    list.push({ key: 'rebook', label: 'Book again', sub: `New appointment with ${apt.doctorName}`, icon: 'calendar-outline', tone: 'primary' });
  }
  return list;
};

export default function AppointmentsRoute() {
  const params = useLocalSearchParams<{ date?: string }>();
  const { appointments: allAppointments, patients, updateAppointmentStatus, activeRole, patientAppUserId } = useApp();
  // Patient app: only the signed-in patient's own visits, never the hospital schedule.
  const patientView = activeRole === 'patient';
  const appointments = useMemo(
    () => (patientView ? allAppointments.filter((a) => a.patientId === patientAppUserId) : allAppointments),
    [allAppointments, patientView, patientAppUserId]
  );
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const keyboardOpen = useKeyboardHeight() > 0;
  const now = useMinuteTick();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const today = todayISO();

  const [selected, setSelected] = useState(() => {
    if (isValidISO(params.date)) return params.date;
    if (patientView) {
      // Open on the patient's next visit rather than an empty "today".
      const next = allAppointments
        .filter((a) => a.patientId === patientAppUserId && a.date >= today && a.status !== 'Cancelled' && a.status !== 'Completed')
        .sort((a, b) => (a.date === b.date ? byTime(a, b) : a.date < b.date ? -1 : 1))[0];
      if (next) return next.date;
    }
    return today;
  });
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<TypeTab>('All');

  const [sheetAptId, setSheetAptId] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);

  // A notification / "View Appointments" can re-target this screen with a new date.
  useEffect(() => {
    if (isValidISO(params.date)) setSelected(params.date);
  }, [params.date]);

  const patientById = useMemo(() => new Map<string, Patient>(patients.map((p) => [p.id, p])), [patients]);

  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    const tokenQuery = /^(?:#|token\s*)?(\d{1,3})$/.exec(q);
    return (a: Appointment) => {
      if (!q) return true;
      if (tokenQuery) return a.tokenNo === Number(tokenQuery[1]);
      const uhid = patientById.get(a.patientId)?.uhid.toLowerCase() ?? '';
      return (
        a.patientName.toLowerCase().includes(q) ||
        a.doctorName.toLowerCase().includes(q) ||
        a.department.toLowerCase().includes(q) ||
        (q.length >= 3 && uhid.includes(q)) ||
        (!!a.reason && a.reason.toLowerCase().includes(q))
      );
    };
  }, [q, patientById]);

  const countByDay = useMemo(() => {
    const map = new Map<string, number>();
    appointments.forEach((a) => {
      if (a.status !== 'Cancelled') map.set(a.date, (map.get(a.date) ?? 0) + 1);
    });
    return map;
  }, [appointments]);

  // Strip: yesterday → +6 days, stretched to include a date picked from the calendar.
  const stripDays: StripDay[] = useMemo(() => {
    const offset = daysFromToday(selected);
    const from = Math.min(-1, offset);
    const to = Math.max(6, offset);
    const days: StripDay[] = [];
    for (let i = from; i <= to; i++) {
      const iso = isoDaysFromToday(i);
      days.push({ iso, count: countByDay.get(iso) ?? 0 });
    }
    return days;
  }, [selected, countByDay, today]);

  const dayAll = useMemo(() => appointments.filter((a) => a.date === selected).sort(byTime), [appointments, selected]);
  const daySearch = useMemo(() => dayAll.filter(matches), [dayAll, matches]);
  const visible = useMemo(() => (tab === 'All' ? daySearch : daySearch.filter((a) => a.type === tab)), [daySearch, tab]);

  const tabCounts = useMemo(
    () =>
      TYPE_TABS.map((t) => ({
        key: t,
        label: t,
        count: t === 'All' ? daySearch.length : daySearch.filter((a) => a.type === t).length,
      })),
    [daySearch]
  );

  const summary = useMemo(() => {
    const active = dayAll.filter((a) => a.status !== 'Cancelled');
    return {
      total: active.length,
      waiting: active.filter((a) => a.status === 'Waiting').length,
      completed: active.filter((a) => a.status === 'Completed').length,
      cancelled: dayAll.length - active.length,
    };
  }, [dayAll]);

  const otherDays = useMemo(() => {
    if (!q) return [];
    const map = new Map<string, number>();
    appointments.forEach((a) => {
      if (a.date !== selected && matches(a)) map.set(a.date, (map.get(a.date) ?? 0) + 1);
    });
    return [...map.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([iso, n]) => ({ iso, n }));
  }, [appointments, matches, q, selected]);

  const rows: Row[] = useMemo(() => {
    const list: Row[] = visible.map((apt, index) => ({ kind: 'apt', apt, index }));
    if (selected === today && list.length) {
      const at = visible.findIndex((a) => clockToMinutes(a.time) > nowMinutes);
      list.splice(at === -1 ? list.length : at, 0, { kind: 'now', key: 'now-divider' });
    }
    return list;
  }, [visible, selected, today, nowMinutes]);

  const sheetApt = sheetAptId ? appointments.find((a) => a.id === sheetAptId) ?? null : null;
  const sheetPatient = sheetApt ? patientById.get(sheetApt.patientId) : undefined;
  const sheetActions = sheetApt
    ? patientView
      ? patientActionsFor(sheetApt, daysFromToday(sheetApt.date))
      : actionsFor(sheetApt, daysFromToday(sheetApt.date), nowMinutes, !!sheetPatient?.phone)
    : [];

  const openStatus = (apt: Appointment) => {
    Haptics.selectionAsync().catch(() => {});
    setSheetAptId(apt.id);
    setConfirmCancel(false);
    setSheetVisible(true);
  };
  // confirmCancel is reset on open, so the sheet doesn't flip views while it slides away.
  const closeSheet = () => setSheetVisible(false);

  const openPatient = (patientId: string) => router.push({ pathname: '/patient/[id]', params: { id: patientId } });

  const runAction = (key: ActionKey) => {
    const apt = sheetApt;
    if (!apt) return;
    const prev = apt.status;
    const first = apt.patientName.split(' ')[0];
    const undo = {
      label: 'Undo',
      onPress: () => updateAppointmentStatus(apt.id, prev),
    };
    switch (key) {
      case 'checkin':
        updateAppointmentStatus(apt.id, 'Waiting');
        closeSheet();
        showToast({ title: 'Checked in', message: `${first} is in the waiting queue • Token #${apt.tokenNo}`, action: undo });
        break;
      case 'start':
        updateAppointmentStatus(apt.id, 'In Consultation');
        closeSheet();
        if (apt.type === 'IPD') openPatient(apt.patientId);
        else router.push({ pathname: '/opd-consultation', params: { patientId: apt.patientId, appointmentId: apt.id } });
        break;
      case 'continue':
        closeSheet();
        if (apt.type === 'IPD') openPatient(apt.patientId);
        else router.push({ pathname: '/opd-consultation', params: { patientId: apt.patientId, appointmentId: apt.id } });
        break;
      case 'complete':
        updateAppointmentStatus(apt.id, 'Completed');
        closeSheet();
        showToast({ title: 'Marked completed', message: `${apt.patientName} • ${apt.time} with ${apt.doctorName}`, action: undo });
        break;
      case 'noshow':
        updateAppointmentStatus(apt.id, 'Not Arrived');
        closeSheet();
        showToast({ type: 'warning', title: 'Marked as no-show', message: `${apt.patientName} • ${apt.time}`, action: undo });
        break;
      case 'cancel':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        setConfirmCancel(true);
        break;
      case 'call': {
        const digits = sheetPatient?.phone.replace(/[^\d+]/g, '');
        if (!digits) return;
        Linking.openURL(`tel:${digits}`).catch(() =>
          showToast({ type: 'info', title: 'Calling unavailable', message: `Dial ${sheetPatient?.phone} from a phone.` })
        );
        break;
      }
      case 'profile':
        closeSheet();
        openPatient(apt.patientId);
        break;
      case 'rebook':
        closeSheet();
        router.push({
          pathname: '/book-appointment',
          params: patientView ? { patientId: apt.patientId, doctorId: apt.doctorId, mode: 'patient' } : { patientId: apt.patientId, doctorId: apt.doctorId },
        });
        break;
      case 'directions':
        closeSheet();
        router.push('/hospital-navigation');
        break;
    }
  };

  const confirmCancellation = () => {
    const apt = sheetApt;
    if (!apt) return;
    const prev = apt.status;
    updateAppointmentStatus(apt.id, 'Cancelled');
    closeSheet();
    showToast({
      type: 'warning',
      title: 'Appointment cancelled',
      message: `${apt.patientName} • ${apt.time} slot released`,
      action: { label: 'Undo', onPress: () => updateAppointmentStatus(apt.id, prev) },
    });
  };

  const selectDate = (iso: string) => {
    setSelected(iso);
  };

  const bookNew = () => {
    const next: Record<string, string> = {};
    if (selected >= today) next.date = selected;
    if (patientView) {
      next.mode = 'patient';
      next.patientId = patientAppUserId;
    }
    router.push({ pathname: '/book-appointment', params: next });
  };

  const pillSpace = 52 + Math.max(insets.bottom, spacing.sm) + spacing.xl + spacing.base;

  const listHeader = (
    <View>
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder={patientView ? 'Search doctor or department…' : 'Search patient, doctor, token or UHID…'}
        style={styles.search}
      />
      <CountTabs tabs={tabCounts} active={tab} onChange={(k) => setTab(k as TypeTab)} variant="fill" style={styles.tabs} />
      <View style={styles.summaryRow}>
        <SummaryChip icon="calendar-outline" label="Total" value={summary.total} color={colors.primary} />
        <SummaryChip icon="hourglass-outline" label="Waiting" value={summary.waiting} color={colors.warning} />
        <SummaryChip icon="checkmark-done-outline" label="Completed" value={summary.completed} color={colors.teal} />
      </View>
      {summary.cancelled > 0 && (
        <Text style={styles.cancelNote}>
          {plural(summary.cancelled, 'cancellation')} on this day {summary.cancelled === 1 ? 'is' : 'are'} shown dimmed.
        </Text>
      )}
    </View>
  );

  const listFooter = otherDays.length ? (
    <FadeInView style={styles.otherDays} offset={8}>
      <Text style={styles.otherTitle}>
        <Ionicons name="search-outline" size={13} color={colors.textSecondary} /> Also matching “{query.trim()}” on other days
      </Text>
      <View style={styles.otherChips}>
        {otherDays.map((d) => (
          <TouchableOpacity key={d.iso} style={styles.otherChip} onPress={() => selectDate(d.iso)} accessibilityRole="button">
            <Text style={styles.otherChipText}>{dayTitle(d.iso)}</Text>
            <View style={styles.otherCount}>
              <Text style={styles.otherCountText}>{d.n}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </FadeInView>
  ) : null;

  const emptyDay = !dayAll.length;
  const listEmpty = emptyDay ? (
    <EmptyState
      icon="calendar-clear-outline"
      title={`No appointments ${daysFromToday(selected) === 0 ? 'today' : `on ${dayTitle(selected)}`}`}
      description={selected >= today ? 'Every slot is open — book a patient in.' : 'Nothing was scheduled on this day.'}
      actionTitle={selected >= today ? 'Book Appointment' : undefined}
      onActionPress={selected >= today ? bookNew : undefined}
    />
  ) : (
    <EmptyState
      icon="search-outline"
      title="No matching appointments"
      description={`Nothing on ${dayTitle(selected)} matches${q ? ` “${query.trim()}”` : ''}${tab !== 'All' ? ` in ${tab}` : ''}.`}
      actionTitle="Clear filters"
      onActionPress={() => {
        setQuery('');
        setTab('All');
      }}
    />
  );

  const renderRow = ({ item }: { item: Row }) => {
    if (item.kind === 'now') {
      return (
        <View style={styles.nowRow} accessibilityLabel={`Now, ${formatClock(now)}`}>
          <PulseDot color={colors.danger} size={8} />
          <Text style={styles.nowText}>Now • {formatClock(now)}</Text>
          <View style={styles.nowLine} />
        </View>
      );
    }
    const { apt, index } = item;
    const patient = patientById.get(apt.patientId);
    const dim = apt.status === 'Cancelled' || apt.status === 'Completed';
    return (
      <FadeInView delay={index < 10 ? stagger(index, 45) : 0} offset={10}>
        <PressableScale
          onPress={() => (patientView ? openStatus(apt) : openPatient(apt.patientId))}
          style={[styles.card, apt.status === 'In Consultation' && styles.cardLive, dim && styles.cardDim]}
          accessibilityRole="button"
          accessibilityLabel={`${apt.time}, ${apt.patientName}, ${apt.department}, ${apt.type}, ${apt.status}`}
          accessibilityHint={patientView ? 'Shows appointment details' : 'Opens the patient record'}
        >
          <View style={styles.timeCol}>
            <Text style={[styles.time, apt.status === 'Cancelled' && styles.struck]}>{apt.time}</Text>
            <Text style={styles.token}>#{apt.tokenNo}</Text>
          </View>
          <Avatar name={apt.patientName} size={42} />
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {apt.patientName}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {apt.department} • {apt.type}
            </Text>
            <Text style={styles.doctor} numberOfLines={1}>
              {apt.doctorName}
              {patient ? ` • ${patient.uhid}` : ''}
            </Text>
          </View>
          <Pressable
            onPress={() => openStatus(apt)}
            hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
            style={({ pressed }) => [styles.statusBtn, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel={`Status ${apt.status}. Change status`}
          >
            <Badge label={apt.status} variant={statusVariant(apt.status)} size="sm" />
            <Ionicons name="chevron-down" size={13} color={colors.textMuted} />
          </Pressable>
        </PressableScale>
      </FadeInView>
    );
  };

  if (!patientView && !canAccess(activeRole, 'appointments')) {
    return <RoleLockScreen title="Appointments" module="appointments" purpose="Managing the OPD schedule" />;
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header
        title={patientView ? 'My Appointments' : 'Appointments'}
        subtitle={`${dayTitle(selected)} • ${plural(summary.total, 'appointment')}`}
        rightAction={
          <HeaderActions>
            {selected !== today && (
              <TouchableOpacity onPress={() => selectDate(today)} style={styles.todayBtn} accessibilityRole="button" accessibilityLabel="Jump to today">
                <Text style={styles.todayBtnText}>Today</Text>
              </TouchableOpacity>
            )}
            <HeaderIconButton icon="calendar-outline" onPress={() => setCalendarVisible(true)} accessibilityLabel="Jump to a date" />
          </HeaderActions>
        }
      />
      <View style={styles.stripBand}>
        <WeekStrip days={stripDays} selected={selected} onSelect={selectDate} />
      </View>

      <KeyboardAwareContainer>
        <FlatList
          data={rows}
          keyExtractor={(r) => (r.kind === 'now' ? r.key : r.apt.id)}
          renderItem={renderRow}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
          contentContainerStyle={[styles.listContent, { paddingBottom: pillSpace }]}
          ItemSeparatorComponent={RowGap}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          {...formScrollProps}
        />
      </KeyboardAwareContainer>

      {!keyboardOpen && (
        <FadeInView delay={200} offset={20} style={[styles.pillWrap, { bottom: Math.max(insets.bottom, spacing.sm) + spacing.base }]}>
          <PressableScale onPress={bookNew} haptic style={styles.pill} accessibilityRole="button" accessibilityLabel="Book appointment">
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.pillText}>Book Appointment</Text>
          </PressableScale>
        </FadeInView>
      )}

      {/* Status & actions */}
      <BottomSheet
        visible={sheetVisible && !!sheetApt}
        onClose={closeSheet}
        title={confirmCancel ? 'Cancel appointment?' : sheetApt?.patientName}
        subtitle={sheetApt ? `${dayTitle(sheetApt.date)} • ${sheetApt.time} • Token #${sheetApt.tokenNo}` : undefined}
        footer={
          confirmCancel ? (
            <View style={styles.confirmRow}>
              <Button title="Keep it" variant="outline" onPress={() => setConfirmCancel(false)} style={styles.confirmBtn} size="lg" />
              <Button title="Yes, cancel" variant="danger" onPress={confirmCancellation} style={styles.confirmBtn} size="lg" />
            </View>
          ) : undefined
        }
      >
        {sheetApt && (
          <View>
            <View style={styles.sheetInfo}>
              <Avatar name={sheetApt.patientName} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetName}>{sheetApt.patientName}</Text>
                <Text style={styles.sheetMeta}>
                  {sheetPatient ? `${sheetPatient.uhid} • ${sheetPatient.age}y ${sheetPatient.gender[0]}` : 'Patient record unavailable'}
                </Text>
                <Text style={styles.sheetMeta}>
                  {sheetApt.doctorName} • {sheetApt.department} • {sheetApt.type}
                </Text>
              </View>
              <Badge label={sheetApt.status} variant={statusVariant(sheetApt.status)} size="sm" />
            </View>
            {!!sheetApt.reason && (
              <View style={styles.reason}>
                <Ionicons name="document-text-outline" size={15} color={colors.textSecondary} />
                <Text style={styles.reasonText}>{sheetApt.reason}</Text>
              </View>
            )}

            {confirmCancel ? (
              <FadeInView offset={8} style={styles.cancelCard}>
                <Ionicons name="warning" size={20} color={colors.danger} />
                <Text style={styles.cancelText}>
                  {patientView
                    ? `Your ${sheetApt.time} appointment with ${sheetApt.doctorName} on ${formatDisplayDate(sheetApt.date)} will be cancelled. For a fee refund, please contact the billing desk.`
                    : `${sheetApt.patientName}’s ${sheetApt.time} slot with ${sheetApt.doctorName} on ${formatDisplayDate(sheetApt.date)} will be released for other patients. Any consultation-fee refund is processed from Billing.`}
                </Text>
              </FadeInView>
            ) : (
              <View style={styles.actions}>
                {sheetActions.map((action, i) => {
                  const tone = TONE_COLOR[action.tone];
                  return (
                    <FadeInView key={action.key} delay={stagger(i, 40)} offset={6}>
                      <PressableScale
                        onPress={() => runAction(action.key)}
                        style={styles.action}
                        accessibilityRole="button"
                        accessibilityLabel={`${action.label}. ${action.sub}`}
                      >
                        <View style={[styles.actionIcon, { backgroundColor: tone.bg }]}>
                          <Ionicons name={action.icon} size={19} color={tone.fg} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.actionLabel, action.tone === 'danger' && { color: colors.danger }]}>{action.label}</Text>
                          <Text style={styles.actionSub} numberOfLines={1}>
                            {action.sub}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                      </PressableScale>
                    </FadeInView>
                  );
                })}
                {sheetApt.status === 'Completed' && (
                  <Text style={styles.doneNote}>This visit is complete — no further status changes.</Text>
                )}
              </View>
            )}
          </View>
        )}
      </BottomSheet>

      {/* Jump to date */}
      <CalendarSheet
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        selected={selected}
        counts={countByDay}
        onPick={(iso) => {
          setCalendarVisible(false);
          selectDate(iso);
        }}
      />
    </SafeAreaView>
  );
}

const RowGap = () => <View style={{ height: spacing.sm }} />;

const SummaryChip: React.FC<{ icon: keyof typeof Ionicons.glyphMap; label: string; value: number; color: string }> = ({ icon, label, value, color }) => (
  <View style={styles.summaryChip} accessibilityLabel={`${label}: ${value}`}>
    <View style={[styles.summaryIcon, { backgroundColor: color + '1A' }]}>
      <Ionicons name={icon} size={15} color={color} />
    </View>
    <View>
      <AnimatedNumber value={value} duration={500} style={styles.summaryValue} />
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  </View>
);

const WEEK_HEADER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const CalendarSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  selected: string;
  counts: Map<string, number>;
  onPick: (iso: string) => void;
}> = ({ visible, onClose, selected, counts, onPick }) => {
  const today = todayISO();
  const days = Array.from({ length: 14 }, (_, i) => isoDaysFromToday(i));
  const first = fromISODate(days[0]);
  const lead = first ? (first.getDay() + 6) % 7 : 0;
  const cells: Array<string | null> = [...Array.from({ length: lead }, () => null), ...days];
  while (cells.length % 7) cells.push(null);
  const firstMonth = formatDisplayDate(days[0]).slice(3);
  const lastMonth = formatDisplayDate(days[days.length - 1]).slice(3);
  const monthLabel = firstMonth === lastMonth ? firstMonth : `${firstMonth.slice(0, 3)} – ${lastMonth}`;

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Jump to date" subtitle={`Next 14 days • ${monthLabel}`}>
      <View style={styles.calHeader}>
        {WEEK_HEADER.map((d) => (
          <Text key={d} style={styles.calHeadText}>
            {d.slice(0, 2)}
          </Text>
        ))}
      </View>
      <View style={styles.calGrid}>
        {cells.map((iso, i) => {
          if (!iso) return <View key={`blank-${i}`} style={styles.calCell} />;
          const d = fromISODate(iso);
          const isSel = iso === selected;
          const isToday = iso === today;
          const n = counts.get(iso) ?? 0;
          return (
            <View key={iso} style={styles.calCell}>
              <PressableScale
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  onPick(iso);
                }}
                scaleTo={0.9}
                style={[styles.calDay, isToday && styles.calToday, isSel && styles.calSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSel }}
                accessibilityLabel={`${dayTitle(iso)}${n ? `, ${plural(n, 'appointment')}` : ', no appointments'}`}
              >
                <Text style={[styles.calNum, isToday && { color: colors.primary }, isSel && styles.calTextSel]}>{d?.getDate()}</Text>
                <Text style={[styles.calCount, isSel && styles.calTextSel, !n && { opacity: 0 }]}>{n || 0}</Text>
              </PressableScale>
            </View>
          );
        })}
      </View>
      <View style={styles.calLegend}>
        <Text style={styles.calLegendText}>Numbers under each date show booked appointments.</Text>
      </View>
      <View style={styles.calQuick}>
        <Button title="Today" variant="outline" size="md" onPress={() => onPick(today)} style={{ flex: 1 }} />
        <Button title="Tomorrow" variant="outline" size="md" onPress={() => onPick(isoDaysFromToday(1))} style={{ flex: 1 }} />
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  todayBtn: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBtnText: { color: colors.primary, fontWeight: typography.fontWeights.bold, fontSize: typography.fontSizes.sm },
  stripBand: {
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  listContent: { paddingHorizontal: spacing.base, paddingTop: spacing.md, flexGrow: 1 },
  search: { marginBottom: spacing.md },
  tabs: { marginBottom: spacing.md },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  summaryChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  summaryIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  summaryValue: { fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.extraBold, color: colors.text },
  summaryLabel: { fontSize: 10.5, color: colors.textSecondary, fontWeight: typography.fontWeights.medium },
  cancelNote: { fontSize: typography.fontSizes.xs, color: colors.textMuted, marginTop: -spacing.xs, marginBottom: spacing.sm },
  nowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2, paddingLeft: 4 },
  nowText: { fontSize: typography.fontSizes.xs, fontWeight: typography.fontWeights.bold, color: colors.danger },
  nowLine: { flex: 1, height: 1.5, backgroundColor: colors.danger + '55', borderRadius: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardLive: { borderColor: colors.primary + '66', backgroundColor: '#F7FAFF' },
  cardDim: { opacity: 0.62 },
  timeCol: { width: 56 },
  time: { fontSize: 12, fontWeight: typography.fontWeights.bold, color: colors.text },
  struck: { textDecorationLine: 'line-through', color: colors.textMuted },
  token: { fontSize: 10.5, color: colors.textMuted, marginTop: 2, fontWeight: typography.fontWeights.semiBold },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: typography.fontSizes.sm + 1, fontWeight: typography.fontWeights.bold, color: colors.text },
  meta: { fontSize: typography.fontSizes.xs + 0.5, color: colors.textSecondary, marginTop: 2 },
  doctor: { fontSize: typography.fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  statusBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
  otherDays: {
    marginTop: spacing.base,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
  },
  otherTitle: { fontSize: typography.fontSizes.xs + 1, fontWeight: typography.fontWeights.semiBold, color: colors.textSecondary, marginBottom: spacing.sm },
  otherChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  otherChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  otherChipText: { fontSize: typography.fontSizes.xs + 1, fontWeight: typography.fontWeights.semiBold, color: colors.primary },
  otherCount: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  otherCountText: { fontSize: 10, fontWeight: typography.fontWeights.bold, color: '#FFFFFF' },
  pillWrap: { position: 'absolute', right: spacing.base },
  pill: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 22,
    borderRadius: 26,
    backgroundColor: colors.primary,
    ...shadows.lg,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
  },
  pillText: { color: '#FFFFFF', fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.bold },
  sheetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.cardMuted,
  },
  sheetName: { fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.bold, color: colors.text },
  sheetMeta: { fontSize: typography.fontSizes.xs + 0.5, color: colors.textSecondary, marginTop: 2 },
  reason: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', marginTop: spacing.md, paddingHorizontal: spacing.xs },
  reasonText: { flex: 1, fontSize: typography.fontSizes.sm, color: colors.text, lineHeight: 19 },
  actions: { marginTop: spacing.md, gap: 2 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  actionIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.semiBold, color: colors.text },
  actionSub: { fontSize: typography.fontSizes.xs + 0.5, color: colors.textSecondary, marginTop: 1 },
  doneNote: { fontSize: typography.fontSizes.xs + 1, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
  cancelCard: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger + '40',
  },
  cancelText: { flex: 1, fontSize: typography.fontSizes.sm, color: colors.dangerText, lineHeight: 20 },
  confirmRow: { flexDirection: 'row', gap: spacing.md },
  confirmBtn: { flex: 1 },
  calHeader: { flexDirection: 'row', marginBottom: spacing.xs },
  calHeadText: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textMuted,
  },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: '14.2857%', padding: 3 },
  calDay: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardMuted,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  calToday: { borderColor: colors.primary + '66', backgroundColor: colors.primaryLight },
  calSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  calNum: { fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.bold, color: colors.text },
  calCount: { fontSize: 9.5, fontWeight: typography.fontWeights.bold, color: colors.primary, marginTop: 1 },
  calTextSel: { color: '#FFFFFF' },
  calLegend: { marginTop: spacing.sm },
  calLegendText: { fontSize: typography.fontSizes.xs, color: colors.textMuted, textAlign: 'center' },
  calQuick: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.base },
});
