import React, { useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { BloodRequest, BloodStock } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { colors, spacing } from '../constants/theme';
import { Header } from '../components/common/Header';
import { SectionHeader } from '../components/common/SectionHeader';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';
import { BottomActionBar, useBottomBarSpace } from '../components/common/BottomActionBar';
import { FadeInView, stagger } from '../components/common/Motion';
import {
  BLOOD_COMPONENTS,
  BLOOD_GROUPS,
  BloodGroup,
  compatibleAlternatives,
  CRITICAL_UNITS,
  groupLevel,
  groupTotal,
  LEVEL_META,
  LOW_UNITS,
  requestStatusOrder,
  stockLevel,
  unitsOf,
} from '../components/operations/bloodBank';
import { BloodStockCard } from '../components/operations/BloodStockCard';
import { BloodRequestCard } from '../components/operations/BloodRequestCard';
import { BloodRequestSheet } from '../components/operations/BloodRequestSheet';
import { BloodDonationSheet } from '../components/operations/BloodDonationSheet';
import { BloodGroupSheet } from '../components/operations/BloodGroupSheet';
import { RejectRequestSheet } from '../components/operations/RejectRequestSheet';
import { ButtonRow, ChoiceChips, KpiRow, LegendItem, Notice } from '../components/operations/OpsUI';
import { afterModal, plural } from '../components/operations/utils';

type RequestFilter = 'Pending' | 'Issued' | 'Rejected' | 'All';

const FILTER_STATUS: Record<Exclude<RequestFilter, 'All'>, BloodRequest['status']> = {
  Pending: 'Pending Cross-match',
  Issued: 'Issued',
  Rejected: 'Rejected',
};

interface SheetState {
  open: boolean;
  group: BloodGroup | null;
}

const CLOSED: SheetState = { open: false, group: null };

export default function BloodBankRoute() {
  const { bloodStock, bloodRequests, getPatient, issueBlood } = useApp();
  const { showToast } = useToast();
  const barSpace = useBottomBarSpace();

  const [filter, setFilter] = useState<RequestFilter>('Pending');
  const [requestSheet, setRequestSheet] = useState<SheetState>(CLOSED);
  const [donationSheet, setDonationSheet] = useState<SheetState>(CLOSED);
  const [groupSheet, setGroupSheet] = useState<SheetState>(CLOSED);
  const [rejectSheet, setRejectSheet] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const scrollRef = useRef<ScrollView>(null);
  const requestsY = useRef(0);

  const orderedStock = useMemo(
    () => [...bloodStock].sort((a, b) => BLOOD_GROUPS.indexOf(a.group) - BLOOD_GROUPS.indexOf(b.group)),
    [bloodStock]
  );

  const stats = useMemo(() => {
    const pending = bloodRequests.filter((r) => r.status === 'Pending Cross-match');
    const criticalItems = orderedStock
      .flatMap((s) =>
        BLOOD_COMPONENTS.filter((c) => stockLevel(s[c.key]) === 'critical').map((c) => ({
          group: s.group,
          units: s[c.key],
          label: `${s.group} ${c.component} (${s[c.key]})`,
        }))
      )
      .sort((a, b) => a.units - b.units);
    return {
      totalUnits: orderedStock.reduce((n, s) => n + groupTotal(s), 0),
      belowMin: orderedStock.filter((s) => groupLevel(s) !== 'ok').length,
      criticalGroups: orderedStock.filter((s) => groupLevel(s) === 'critical'),
      criticalItems,
      pending: pending.length,
      emergencies: pending.filter((r) => r.priority === 'Emergency').length,
    };
  }, [orderedStock, bloodRequests]);

  const counts: Record<RequestFilter, number> = {
    Pending: bloodRequests.filter((r) => r.status === 'Pending Cross-match').length,
    Issued: bloodRequests.filter((r) => r.status === 'Issued').length,
    Rejected: bloodRequests.filter((r) => r.status === 'Rejected').length,
    All: bloodRequests.length,
  };

  const visibleRequests = useMemo(
    () =>
      bloodRequests
        .filter((r) => filter === 'All' || r.status === FILTER_STATUS[filter])
        .map((r, i) => ({ r, i }))
        .sort(
          (a, b) =>
            requestStatusOrder[a.r.status] - requestStatusOrder[b.r.status] ||
            (a.r.priority === 'Emergency' ? 0 : 1) - (b.r.priority === 'Emergency' ? 0 : 1) ||
            a.i - b.i
        )
        .map((x) => x.r),
    [bloodRequests, filter]
  );

  const stockOf = (group: BloodGroup) => bloodStock.find((s) => s.group === group);

  const openDonation = (group: BloodGroup | null = null) => setDonationSheet({ open: true, group });
  const openRequest = (group: BloodGroup | null = null) => setRequestSheet({ open: true, group });

  const shortageMessage = (req: BloodRequest, available: number) => {
    const alternatives = compatibleAlternatives(bloodStock, req.component, req.group)
      .filter((a) => a.units >= req.units)
      .slice(0, 3);
    const lines = [
      `${req.group} ${req.component}: ${plural(available, 'unit')} in stock, ${req.units} requested — short by ${plural(req.units - available, 'unit')}.`,
    ];
    if (alternatives.length) {
      lines.push(`Compatible ${req.component} in stock: ${alternatives.map((a) => `${a.group} (${a.units})`).join(', ')}.`);
    }
    lines.push('Record a donation or arrange units from a partner blood bank.');
    return lines.join('\n\n');
  };

  const runIssue = (req: BloodRequest, fromAlert: boolean) => {
    const available = unitsOf(stockOf(req.group), req.component);
    const result = issueBlood(req.id);
    if (result.ok) {
      showToast({
        title: 'Blood issued',
        message: `${plural(req.units, 'unit')} ${req.group} ${req.component} released for ${req.patientName}`,
        type: 'success',
      });
      return;
    }
    const show = () =>
      result.error === 'INSUFFICIENT'
        ? Alert.alert('Unable to issue — insufficient stock', shortageMessage(req, available), [
            { text: 'Close', style: 'cancel' },
            { text: 'Record donation', onPress: () => afterModal(() => openDonation(req.group)) },
          ])
        : Alert.alert('Unable to issue', 'This request is no longer pending cross-match.');
    if (fromAlert) afterModal(show);
    else show();
  };

  const handleIssue = (req: BloodRequest) => {
    const available = unitsOf(stockOf(req.group), req.component);
    if (available < req.units) {
      runIssue(req, false);
      return;
    }
    Alert.alert(
      'Confirm issue',
      `Release ${plural(req.units, 'unit')} of ${req.group} ${req.component} for ${req.patientName}?\n\n• Cross-match compatible and bag labels verified\n• Stock: ${available} → ${available - req.units} ${req.component} units`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Issue', onPress: () => runIssue(req, true) },
      ]
    );
  };

  const firstCritical = stats.criticalItems[0]?.group ?? null;
  const stockRows: BloodStock[][] = [];
  for (let i = 0; i < orderedStock.length; i += 2) stockRows.push(orderedStock.slice(i, i + 2));

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header
        title="Blood Bank"
        subtitle={`${plural(stats.totalUnits, 'unit')} in storage • ${stats.pending} pending cross-match`}
        showBack
      />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: barSpace + spacing.base }]}
      >
        <KpiRow
          items={[
            {
              key: 'units',
              label: 'Total units',
              value: stats.totalUnits,
              icon: 'water',
              color: colors.danger,
              bg: colors.dangerLight,
              sub: `${orderedStock.length} blood groups`,
            },
            {
              key: 'min',
              label: 'Below minimum',
              value: stats.belowMin,
              icon: 'trending-down',
              color: colors.warning,
              bg: colors.warningLight,
              sub: `${stats.criticalGroups.length} critical`,
            },
            {
              key: 'pending',
              label: 'Pending requests',
              value: stats.pending,
              icon: 'hourglass-outline',
              color: colors.primary,
              bg: colors.primaryLight,
              sub: `${stats.emergencies} emergency`,
              onPress: () => {
                setFilter('Pending');
                scrollRef.current?.scrollTo({ y: Math.max(0, requestsY.current - spacing.sm), animated: true });
              },
            },
          ]}
        />

        {stats.criticalItems.length > 0 && (
          <FadeInView delay={180}>
            <Notice
              tone="danger"
              title="Critical stock"
              message={`${stats.criticalItems
                .slice(0, 4)
                .map((x) => x.label)
                .join(' • ')}${
                stats.criticalItems.length > 4 ? ` • +${stats.criticalItems.length - 4} more` : ''
              }. Call registered donors or request a transfer.`}
              action={{ label: 'Donation', onPress: () => openDonation(firstCritical) }}
              style={styles.alert}
            />
          </FadeInView>
        )}

        <SectionHeader title="Blood stock" meta="Tap a group for details" />
        <View style={styles.legend}>
          <LegendItem label="Adequate" color={LEVEL_META.ok.color} />
          <LegendItem label={`Low ≤${LOW_UNITS}`} color={LEVEL_META.low.color} />
          <LegendItem label={`Critical ≤${CRITICAL_UNITS}`} color={LEVEL_META.critical.color} />
        </View>

        <View style={styles.grid}>
          {stockRows.map((row, r) => (
            <View key={row.map((s) => s.group).join('-')} style={styles.gridRow}>
              {row.map((s, c) => (
                <FadeInView key={s.group} delay={stagger(r * 2 + c, 50)} style={styles.gridCell}>
                  <BloodStockCard
                    stock={s}
                    delay={stagger(r * 2 + c, 50) + 150}
                    onPress={() => setGroupSheet({ open: true, group: s.group })}
                  />
                </FadeInView>
              ))}
              {row.length === 1 && <View style={styles.gridCell} />}
            </View>
          ))}
        </View>

        <View onLayout={(e) => (requestsY.current = e.nativeEvent.layout.y)}>
          <SectionHeader title="Blood requests" meta={`${counts.Pending} pending`} actionLabel="New" onActionPress={() => openRequest()} />
        </View>
        <ChoiceChips
          scroll
          bleed={spacing.base}
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'Pending', label: 'Pending', count: counts.Pending, icon: 'hourglass-outline' },
            { value: 'Issued', label: 'Issued', count: counts.Issued, icon: 'checkmark-done' },
            { value: 'Rejected', label: 'Rejected', count: counts.Rejected, icon: 'close-circle-outline' },
            { value: 'All', label: 'All', count: counts.All },
          ]}
        />

        <View style={styles.list}>
          {visibleRequests.length ? (
            visibleRequests.map((req, i) => (
              <FadeInView key={req.id} delay={stagger(i)}>
                <BloodRequestCard
                  request={req}
                  patient={getPatient(req.patientId)}
                  available={unitsOf(stockOf(req.group), req.component)}
                  onIssue={() => handleIssue(req)}
                  onReject={() => setRejectSheet({ open: true, id: req.id })}
                />
              </FadeInView>
            ))
          ) : (
            <EmptyState
              icon="water-outline"
              title={filter === 'All' ? 'No blood requests yet' : `No ${filter.toLowerCase()} requests`}
              description={
                filter === 'Pending'
                  ? 'All cross-match requests have been handled. New ward requests appear here.'
                  : 'Requests move here as the blood bank processes them.'
              }
              actionTitle="New request"
              onActionPress={() => openRequest()}
            />
          )}
        </View>
      </ScrollView>

      <BottomActionBar>
        <ButtonRow>
          <Button
            title="Donation"
            variant="outline"
            onPress={() => openDonation()}
            style={styles.flex}
            icon={<Ionicons name="water-outline" size={17} color={colors.primary} />}
          />
          <Button
            title="New request"
            onPress={() => openRequest()}
            style={styles.flex}
            icon={<Ionicons name="add" size={18} color="#FFFFFF" />}
          />
        </ButtonRow>
      </BottomActionBar>

      <BloodGroupSheet
        visible={groupSheet.open}
        onClose={() => setGroupSheet((s) => ({ ...s, open: false }))}
        stock={groupSheet.group ? stockOf(groupSheet.group) : undefined}
        allStock={bloodStock}
        onDonate={(g) => {
          setGroupSheet((s) => ({ ...s, open: false }));
          afterModal(() => openDonation(g));
        }}
        onRequest={(g) => {
          setGroupSheet((s) => ({ ...s, open: false }));
          afterModal(() => openRequest(g));
        }}
      />

      <BloodRequestSheet
        visible={requestSheet.open}
        initialGroup={requestSheet.group}
        onClose={() => setRequestSheet((s) => ({ ...s, open: false }))}
        onCreated={(message) => {
          setRequestSheet(CLOSED);
          setFilter('Pending');
          showToast({ title: 'Request sent to blood bank', message, type: 'success' });
        }}
      />

      <RejectRequestSheet
        visible={rejectSheet.open}
        request={rejectSheet.id ? bloodRequests.find((r) => r.id === rejectSheet.id) ?? null : null}
        onClose={() => setRejectSheet((s) => ({ ...s, open: false }))}
        onRejected={(updated) => {
          setRejectSheet((s) => ({ ...s, open: false }));
          showToast({
            title: 'Request rejected',
            message: `${updated.patientName} • ${plural(updated.units, 'unit')} ${updated.group} ${updated.component} — ${updated.rejectionReason ?? ''}`,
            type: 'warning',
            icon: 'close-circle',
            action: { label: 'View', onPress: () => setFilter('Rejected') },
          });
        }}
        onFailed={() => {
          setRejectSheet((s) => ({ ...s, open: false }));
          afterModal(() => Alert.alert('Unable to reject', 'This request was already issued or closed by the blood bank.'));
        }}
      />

      <BloodDonationSheet
        visible={donationSheet.open}
        initialGroup={donationSheet.group}
        onClose={() => setDonationSheet((s) => ({ ...s, open: false }))}
        onRecorded={(group, units, newTotal) => {
          setDonationSheet(CLOSED);
          showToast({
            title: 'Donation recorded',
            message: `+${plural(units, 'unit')} ${group} whole blood • ${newTotal} now in stock`,
            type: 'success',
          });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
  },
  alert: {
    marginTop: spacing.md,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.base,
    marginTop: -spacing.xs,
    marginBottom: spacing.md,
  },
  grid: {
    gap: spacing.md,
  },
  gridRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  gridCell: {
    flex: 1,
  },
  list: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  flex: {
    flex: 1,
  },
});
