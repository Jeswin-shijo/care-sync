import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { useAlert } from '../context/AlertContext';
import { queueApi } from '../api/queueApi';
import { errorMessage } from '../api/client';
import type { ApiQueueBoard, ApiQueueToken } from '../api/types';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { SectionHeader } from '../components/common/SectionHeader';
import { HeaderActions, HeaderIconButton } from '../components/orders/HeaderIconButton';
import { RoleLockScreen } from '../components/orders/RoleLock';
import { canAccess } from '../logic/access';
import { formatClock } from '../utils/dates';

// The day's token queue from the server: call the next patient to a room, announce
// again, mark a no-show, put someone back. The waiting-room display follows every
// change. Checking in happens on the Appointments screen (or the web front desk).

const POLL_MS = 5000;
/** The room chosen last, for this app session. */
let lastRoom = '';

const clockOf = (iso?: string) => (iso ? formatClock(new Date(iso)) : '—');

export default function QueueRoute() {
  const { dataMode, activeRole, refreshData } = useApp();
  if (dataMode !== 'live') {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <Header title="Token Queue" />
        <EmptyState
          icon="ticket-outline"
          title="The queue runs on the MediOS server"
          description="Sign in with a staff account to call tokens, mark no-shows and drive the waiting-room display. The offline demo has no shared queue."
        />
      </SafeAreaView>
    );
  }
  if (!canAccess(activeRole, 'queue')) {
    return <RoleLockScreen title="Token Queue" module="queue" purpose="Calling checked-in patients to a room" />;
  }
  return <LiveQueue refreshData={refreshData} />;
}

function LiveQueue({ refreshData }: { refreshData: () => Promise<void> }) {
  const { showToast } = useToast();
  const { showAlert } = useAlert();
  const [board, setBoard] = useState<ApiQueueBoard | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [room, setRoom] = useState(lastRoom);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  /** Queue actions change appointments too; the hospital reloads when the screen is left. */
  const changed = useRef(false);

  const load = useCallback(
    () =>
      queueApi.board().then(
        (next) => {
          setBoard(next);
          setLoadError(null);
        },
        (err) => setLoadError(errorMessage(err))
      ),
    []
  );

  // Poll while the screen is focused and the app is in the foreground.
  useFocusEffect(
    useCallback(() => {
      load();
      const timer = setInterval(() => {
        if (AppState.currentState === 'active') load();
      }, POLL_MS);
      return () => {
        clearInterval(timer);
        if (changed.current) {
          changed.current = false;
          refreshData();
        }
      };
    }, [load, refreshData])
  );

  const rooms = board?.settings.counters ?? [];
  const myRoom = rooms.includes(room) ? room : (rooms[0] ?? '');
  useEffect(() => {
    lastRoom = myRoom;
  }, [myRoom]);

  const tokens = board?.tokens ?? [];
  const waiting = tokens.filter((t) => t.status === 'waiting').sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const current = tokens.find((t) => t.status === 'called' && t.counter === myRoom) ?? null;
  const otherRooms = tokens.filter((t) => t.status === 'called' && t.counter !== myRoom);
  const skipped = tokens.filter((t) => t.status === 'skipped');
  const next = waiting[0] ?? null;

  const act = async <T,>(run: () => Promise<T>, done?: (result: T) => void) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await run();
      changed.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      done?.(result);
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      showToast({ type: 'danger', title: 'Queue not updated', message: errorMessage(err) });
    } finally {
      setBusy(false);
      load();
    }
  };

  const callNext = () =>
    act(
      () => queueApi.callNext(myRoom, current?.id),
      (r) =>
        r.called
          ? showToast({ title: `Token ${r.called.label} called`, message: `${r.called.patientName} → ${myRoom}` })
          : showToast({ type: 'info', title: r.completed ? `Token ${r.completed.label} done` : 'No one is waiting', message: 'The queue is empty.' })
    );

  const callNow = (t: ApiQueueToken) =>
    act(
      () => queueApi.callToken(t.id, myRoom, current?.id),
      (r) => r.called && showToast({ title: `Token ${r.called.label} called`, message: `${r.called.patientName} → ${myRoom}` })
    );

  const confirmCancel = (t: ApiQueueToken) =>
    showAlert({
      title: `Cancel token ${t.label}?`,
      message: `${t.patientName} leaves the queue. Check them in again if they come back.`,
      type: 'warning',
      buttons: [
        { text: 'Keep', style: 'cancel' },
        { text: 'Cancel token', style: 'destructive', onPress: () => act(() => queueApi.cancel(t.id)) },
      ],
    });

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const stats = board?.stats;
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header
        title="Token Queue"
        subtitle={stats ? `Today • ${stats.waiting} waiting • ${stats.completed} seen` : 'Today'}
        rightAction={
          <HeaderActions>
            <HeaderIconButton icon="refresh" onPress={onRefresh} accessibilityLabel="Refresh the queue" />
          </HeaderActions>
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {loadError && (
          <View style={styles.errorBox} accessibilityLiveRegion="polite">
            <Ionicons name="cloud-offline-outline" size={16} color={colors.danger} />
            <Text style={styles.errorText}>Queue not updating: {loadError}</Text>
          </View>
        )}

        {rooms.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rooms}>
            {rooms.map((r) => (
              <Pressable
                key={r}
                onPress={() => setRoom(r)}
                style={[styles.roomChip, r === myRoom && styles.roomChipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: r === myRoom }}
                accessibilityLabel={`Call to ${r}`}
              >
                <Text style={[styles.roomChipText, r === myRoom && styles.roomChipTextActive]}>{r}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Now serving */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Now serving{myRoom ? ` · ${myRoom}` : ''}</Text>
          {current ? (
            <View style={styles.serving}>
              <View style={styles.tokenBox}>
                <Text style={styles.tokenBoxLabel}>TOKEN</Text>
                <Text style={styles.tokenBoxValue}>{current.label}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.servingName} numberOfLines={1}>
                  {current.patientName}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {current.appointmentTime ? `Appt ${current.appointmentTime}` : 'Walk-in'}
                  {current.note ? ` • ${current.note}` : ''}
                </Text>
                <Text style={styles.metaMuted}>
                  Called {clockOf(current.calledAt)}
                  {current.recalls ? ` • announced ${current.recalls + 1}×` : ''}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.free}>
              {board ? (next ? `${myRoom} is free. Next: ${next.label} ${next.patientName}` : 'No one is waiting.') : 'Loading the queue…'}
            </Text>
          )}

          <Button
            title={current ? (next ? 'Done, call next' : 'Done') : 'Call next'}
            onPress={callNext}
            disabled={busy || !myRoom || (!current && !next)}
            loading={busy}
            fullWidth
            size="lg"
            icon={<Ionicons name="megaphone-outline" size={18} color={colors.textInverse} />}
            style={{ marginTop: spacing.md }}
          />
          {current && (
            <View style={styles.secondaryRow}>
              <Button title="Announce again" variant="outline" size="sm" onPress={() => act(() => queueApi.recall(current.id))} disabled={busy} style={{ flex: 1 }} />
              <Button
                title="Did not come"
                variant="outline"
                size="sm"
                onPress={() => act(() => queueApi.skip(current.id), () => showToast({ type: 'info', title: `Token ${current.label} skipped`, message: 'Put it back when the patient returns.' }))}
                disabled={busy}
                style={{ flex: 1 }}
              />
            </View>
          )}
          {otherRooms.length > 0 && (
            <Text style={[styles.metaMuted, { marginTop: spacing.md }]}>
              {otherRooms.map((t) => `${t.counter}: ${t.label}`).join('   •   ')}
            </Text>
          )}
        </View>

        {/* Waiting */}
        <SectionHeader title={`Waiting (${waiting.length})`} meta="Priority first, then by number" />
        <View style={styles.list}>
          {waiting.map((t, i) => (
            <View key={t.id} style={[styles.row, i < waiting.length - 1 && styles.rowDivider]}>
              <Text style={styles.position}>{t.position}</Text>
              <View style={styles.rowToken}>
                <Text style={styles.rowTokenText}>{t.label}</Text>
                {t.priority && <Ionicons name="star" size={12} color={colors.warning} accessibilityLabel="Priority" />}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {t.patientName}
                </Text>
                <Text style={styles.metaMuted} numberOfLines={1}>
                  {t.appointmentTime ? `Appt ${t.appointmentTime}` : 'Walk-in'} • arrived {clockOf(t.createdAt)}
                </Text>
              </View>
              <Pressable onPress={() => callNow(t)} disabled={busy || !myRoom} hitSlop={6} style={styles.callBtn} accessibilityRole="button" accessibilityLabel={`Call token ${t.label} now`}>
                <Ionicons name="megaphone-outline" size={16} color={colors.primary} />
              </Pressable>
              <Pressable onPress={() => confirmCancel(t)} disabled={busy} hitSlop={6} style={styles.cancelBtn} accessibilityRole="button" accessibilityLabel={`Cancel token ${t.label}`}>
                <Ionicons name="close" size={16} color={colors.danger} />
              </Pressable>
            </View>
          ))}
          {!waiting.length && <Text style={styles.emptyRow}>{board ? 'No one is waiting. Check patients in from Appointments.' : 'Loading…'}</Text>}
        </View>

        {skipped.length > 0 && (
          <>
            <SectionHeader title={`Did not come (${skipped.length})`} />
            <View style={styles.list}>
              {skipped.map((t, i) => (
                <View key={t.id} style={[styles.row, i < skipped.length - 1 && styles.rowDivider]}>
                  <View style={styles.rowToken}>
                    <Text style={styles.rowTokenText}>{t.label}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {t.patientName}
                    </Text>
                    <Text style={styles.metaMuted}>
                      Called {clockOf(t.calledAt)} to {t.counter}
                    </Text>
                  </View>
                  <Button title="Back in queue" size="sm" variant="outline" onPress={() => act(() => queueApi.requeue(t.id))} disabled={busy} />
                  <Pressable onPress={() => confirmCancel(t)} disabled={busy} hitSlop={6} style={styles.cancelBtn} accessibilityRole="button" accessibilityLabel={`Cancel token ${t.label}`}>
                    <Ionicons name="close" size={16} color={colors.danger} />
                  </Pressable>
                </View>
              ))}
            </View>
          </>
        )}

        {stats && (
          <Text style={styles.footnote}>
            {stats.issued} tokens today • {stats.completed} seen
            {stats.averageWaitMinutes != null ? ` • average wait ${stats.averageWaitMinutes} min` : ''}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.base, paddingBottom: spacing.xxl, gap: spacing.md },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerLight,
  },
  errorText: { flex: 1, fontSize: typography.fontSizes.sm, color: colors.dangerText },
  rooms: { gap: spacing.sm },
  roomChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roomChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roomChipText: { fontSize: typography.fontSizes.sm, color: colors.textSecondary, fontWeight: typography.fontWeights.semiBold },
  roomChipTextActive: { color: colors.textInverse },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardTitle: { fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.bold, color: colors.text, marginBottom: spacing.md },
  serving: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tokenBox: {
    minWidth: 84,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
  },
  tokenBoxLabel: { fontSize: 10, letterSpacing: 0.8, fontWeight: typography.fontWeights.bold, color: colors.primaryDark },
  tokenBoxValue: { fontSize: 34, fontWeight: typography.fontWeights.extraBold, color: colors.primaryDark, fontVariant: ['tabular-nums'] },
  servingName: { fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.bold, color: colors.text },
  meta: { marginTop: 2, fontSize: typography.fontSizes.sm, color: colors.textSecondary },
  metaMuted: { marginTop: 2, fontSize: typography.fontSizes.xs + 1, color: colors.textMuted },
  free: { fontSize: typography.fontSizes.sm, color: colors.textSecondary, lineHeight: 20 },
  secondaryRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  list: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  position: { width: 18, fontSize: typography.fontSizes.xs, color: colors.textMuted, textAlign: 'center' },
  rowToken: { minWidth: 44, flexDirection: 'row', alignItems: 'center', gap: 3 },
  rowTokenText: { fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.bold, color: colors.text, fontVariant: ['tabular-nums'] },
  rowName: { fontSize: typography.fontSizes.sm + 1, fontWeight: typography.fontWeights.semiBold, color: colors.text },
  callBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight },
  cancelBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dangerLight },
  emptyRow: { paddingVertical: spacing.lg, textAlign: 'center', fontSize: typography.fontSizes.sm, color: colors.textMuted },
  footnote: { textAlign: 'center', fontSize: typography.fontSizes.xs + 1, color: colors.textMuted, marginTop: spacing.sm },
});
