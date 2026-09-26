import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import type { Patient, WardInfo } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { colors, radius, spacing, typography } from '../constants/theme';
import { daysFromToday } from '../utils/dates';
import { formatCurrency } from '../utils/formatters';
import { Header } from '../components/common/Header';
import { SectionHeader } from '../components/common/SectionHeader';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';
import { Avatar } from '../components/common/Avatar';
import { Badge } from '../components/common/Badge';
import { BottomSheet } from '../components/common/BottomSheet';
import { BottomActionBar, useBottomBarSpace } from '../components/common/BottomActionBar';
import { FadeInView, PressableScale, stagger } from '../components/common/Motion';
import { BedGrid } from '../components/operations/BedGrid';
import { WardCard } from '../components/operations/WardCard';
import {
  admitTitle,
  BedTile,
  bedDisplayNumber,
  bedLabel,
  findWardByParam,
  roomTypeForWard,
  tilesFromBedMap,
  wardGender,
  wardShortName,
} from '../components/operations/beds';
import { ButtonRow, cardStyle, InfoRow, KpiRow, LegendItem, Notice, Segmented } from '../components/operations/OpsUI';
import { afterModal, callNumber, plural } from '../components/operations/utils';

type BedFilter = 'all' | 'occupied' | 'available';

/** Scroll gutter + bed-map card padding + border, used before the grid is measured. */
const GRID_INSET = spacing.base * 2 + spacing.md * 2 + 2;

const stayLabel = (p: Patient) => {
  if (!p.admittedOn) return 'Admitted';
  const days = Math.max(0, -daysFromToday(p.admittedOn));
  return days === 0 ? 'Admitted today' : `Stay ${plural(days, 'day')}`;
};

export default function BedManagementRoute() {
  const params = useLocalSearchParams<{ ward?: string }>();
  const { wardInfo, patients, bedSummary, dischargeSummaries, nurseTasks, hospitalProfile, getWardBedMap } = useApp();
  const { width } = useWindowDimensions();
  const barSpace = useBottomBarSpace();

  const [wardId, setWardId] = useState<string>(() => findWardByParam(wardInfo, params.ward)?.id ?? wardInfo[0]?.id ?? '');
  const [filter, setFilter] = useState<BedFilter>('all');
  const [gridWidth, setGridWidth] = useState(width - GRID_INSET);
  const [sheet, setSheet] = useState<{ open: boolean; tile: BedTile | null }>({ open: false, tile: null });

  // Deep links / AI action cards can re-open this screen with another ward.
  useEffect(() => {
    const match = findWardByParam(wardInfo, params.ward);
    if (match) setWardId(match.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.ward]);

  const ward = wardInfo.find((w) => w.id === wardId) ?? wardInfo[0];

  // Single source of truth shared with admitPatient: named beds, occupied beds, free beds.
  const bedMap = useMemo(() => (ward ? getWardBedMap(ward.id) : null), [ward, getWardBedMap]);
  const tiles = useMemo(() => (ward && bedMap ? tilesFromBedMap(ward, bedMap) : []), [ward, bedMap]);
  const counts = useMemo(() => {
    const available = tiles.filter((t) => t.kind === 'available').length;
    return { all: tiles.length, available, occupied: tiles.length - available };
  }, [tiles]);
  const shown = useMemo(
    () => (filter === 'all' ? tiles : tiles.filter((t) => (filter === 'available' ? t.kind === 'available' : t.kind !== 'available'))),
    [tiles, filter]
  );
  const named = useMemo(() => tiles.filter((t) => t.kind === 'patient' && t.patient), [tiles]);
  /** The bed an admission gets when no specific bed is chosen. */
  const nextFree = bedMap?.free[0] ?? null;

  const pendingDischarges = useMemo(() => {
    const drafts = new Set(dischargeSummaries.filter((d) => d.status === 'Draft').map((d) => d.patientId));
    const tasks = new Map(
      nurseTasks.filter((t) => t.category === 'Discharge' && !t.completed && t.patientId).map((t) => [t.patientId as string, t])
    );
    return patients
      .filter((p) => p.status === 'Admitted' && (drafts.has(p.id) || tasks.has(p.id)))
      .map((p) => ({ patient: p, draft: drafts.has(p.id), task: tasks.get(p.id) }));
  }, [dischargeSummaries, nurseTasks, patients]);

  const onPressTile = useCallback((tile: BedTile) => {
    if (tile.kind === 'patient' && tile.patient) {
      router.push({ pathname: '/patient/[id]', params: { id: tile.patient.id } });
      return;
    }
    Haptics.selectionAsync().catch(() => {});
    setSheet({ open: true, tile });
  }, []);

  const closeSheet = () => setSheet((s) => ({ ...s, open: false }));

  /** Opens IPD admission for this ward; with `bedNo` that exact bed is reserved (BED_TAKEN if it goes first). */
  const startAdmission = (w: WardInfo, bedNo?: number) => {
    closeSheet();
    router.push({
      pathname: '/ipd-admission',
      params: bedNo ? { roomType: roomTypeForWard(w), wardId: w.id, bedNo: String(bedNo) } : { roomType: roomTypeForWard(w), wardId: w.id },
    });
  };

  if (!ward) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <Header title="Bed Management" showBack />
        <EmptyState icon="bed-outline" title="No wards configured" description="Add wards in hospital settings to manage beds here." />
      </SafeAreaView>
    );
  }

  const sheetTile = sheet.tile;
  const gender = wardGender(ward);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header title="Bed Management" subtitle={`${bedSummary.pct}% occupancy • ${bedSummary.available} beds free`} showBack />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: barSpace + spacing.base }]}>
        <KpiRow
          items={[
            { key: 'total', label: 'Total beds', value: bedSummary.total, icon: 'bed', color: colors.primary, bg: colors.primaryLight, sub: `${wardInfo.length} wards` },
            { key: 'occ', label: 'Occupied', value: bedSummary.occupied, icon: 'person', color: colors.danger, bg: colors.dangerLight, sub: `${bedSummary.pct}% full` },
            {
              key: 'free',
              label: 'Available',
              value: bedSummary.available,
              icon: 'checkmark-circle',
              color: colors.success,
              bg: colors.successLight,
              sub: `ICU ${bedSummary.icuAvailable}/${bedSummary.icuTotal} free`,
            },
          ]}
        />

        <SectionHeader title="Wards" meta="Tap a ward to see its beds" />
        <View style={styles.wardGrid}>
          {Array.from({ length: Math.ceil(wardInfo.length / 2) }, (_, r) => wardInfo.slice(r * 2, r * 2 + 2)).map((row, r) => (
            <View key={row.map((w) => w.id).join('|')} style={styles.wardRow}>
              {row.map((w, c) => (
                <FadeInView key={w.id} delay={stagger(r * 2 + c, 50)} style={styles.flex}>
                  <WardCard
                    ward={w}
                    selected={w.id === ward.id}
                    delay={stagger(r * 2 + c, 50) + 120}
                    onPress={() => {
                      setWardId(w.id);
                      setFilter('all');
                    }}
                  />
                </FadeInView>
              ))}
              {row.length === 1 && <View style={styles.flex} />}
            </View>
          ))}
        </View>

        <SectionHeader
          title={ward.name}
          meta={ward.type === 'Deluxe' ? `Suites 101–${100 + ward.totalBeds}` : `Beds 1–${ward.totalBeds}`}
        />
        <View style={styles.mapCard}>
          <Text style={styles.mapSummary}>
            {counts.occupied} occupied • {counts.available} available
            {ward.dailyRate ? ` • ${formatCurrency(ward.dailyRate)}/day` : ''}
          </Text>
          {nextFree !== null && (
            <Text style={styles.nextFree}>
              Next free: {ward.type === 'Deluxe' ? `Suite ${bedDisplayNumber(ward, nextFree)}` : `Bed ${nextFree}`} — allotted when no bed is picked
            </Text>
          )}
          <Segmented
            style={styles.segment}
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all' as BedFilter, label: 'All', badge: counts.all },
              { value: 'occupied' as BedFilter, label: 'Occupied', badge: counts.occupied, tone: colors.textSecondary },
              { value: 'available' as BedFilter, label: 'Free', badge: counts.available, tone: colors.success },
            ]}
          />
          <View style={styles.legend}>
            <LegendItem label="Patient record" color={colors.primary} />
            <LegendItem label="Occupied" color={colors.border} />
            <LegendItem label="Available" color={colors.success} outline />
          </View>

          <View onLayout={(e) => setGridWidth(Math.floor(e.nativeEvent.layout.width))}>
            {shown.length ? (
              <FadeInView key={`${ward.id}-${filter}`} offset={8} duration={260}>
                <BedGrid tiles={shown} ward={ward} width={gridWidth} onPressTile={onPressTile} />
              </FadeInView>
            ) : (
              <EmptyState
                icon={filter === 'available' ? 'bed-outline' : 'checkmark-done-outline'}
                title={filter === 'available' ? `${wardShortName(ward)} is full` : 'No occupied beds'}
                description={filter === 'available' ? 'Pick another ward above to find a free bed.' : 'Every bed in this ward is free.'}
              />
            )}
          </View>
        </View>

        {named.length > 0 && (
          <>
            <SectionHeader title={`Patients in ${wardShortName(ward)}`} meta={plural(named.length, 'record')} />
            <View style={styles.list}>
              {named.map((t, i) => {
                const p = t.patient as Patient;
                return (
                  <FadeInView key={p.id} delay={stagger(i)}>
                    <PressableScale
                      style={styles.row}
                      onPress={() => router.push({ pathname: '/patient/[id]', params: { id: p.id } })}
                      accessibilityRole="button"
                      accessibilityLabel={`${p.name}, ${bedLabel(ward, t.number)}. Open patient record`}
                    >
                      <View style={styles.bedBadge}>
                        <Text style={styles.bedBadgeText}>{bedDisplayNumber(ward, t.number)}</Text>
                      </View>
                      <Avatar name={p.name} size={38} />
                      <View style={styles.flex}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {p.name}
                        </Text>
                        <Text style={styles.rowMeta} numberOfLines={1}>
                          {p.attendingDoctor ?? 'Duty doctor'} • {stayLabel(p)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </PressableScale>
                  </FadeInView>
                );
              })}
            </View>
          </>
        )}

        <SectionHeader title="Pending discharges" meta={pendingDischarges.length ? plural(pendingDischarges.length, 'patient') : undefined} />
        {pendingDischarges.length ? (
          <View style={styles.list}>
            {pendingDischarges.map(({ patient: p, draft, task }, i) => (
              <FadeInView key={p.id} delay={stagger(i)}>
                <PressableScale
                  style={styles.row}
                  onPress={() => router.push({ pathname: '/discharge-summary', params: { patientId: p.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${p.name}, ${p.room ?? ''}. Open discharge summary`}
                >
                  <View style={styles.dischargeIcon}>
                    <Ionicons name="exit-outline" size={18} color={colors.warning} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {p.room ?? 'Ward'} • {p.attendingDoctor ?? 'Duty doctor'}
                    </Text>
                    <Text style={styles.rowHint} numberOfLines={1}>
                      {draft ? 'Draft summary ready for sign-off' : 'Summary to be drafted'}
                      {task ? ` • Prep due ${task.timeDue}` : ''}
                    </Text>
                  </View>
                  <Badge label="Draft" variant="warning" size="sm" />
                </PressableScale>
              </FadeInView>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <EmptyState icon="checkmark-done-outline" title="No discharges pending" description="Draft discharge summaries appear here for sign-off." />
          </View>
        )}
      </ScrollView>

      <BottomActionBar>
        <Button
          title={ward.available > 0 ? `Admit to ${wardShortName(ward)} • ${ward.available} free` : `${wardShortName(ward)} is full`}
          onPress={() => startAdmission(ward)}
          disabled={ward.available <= 0}
          size="lg"
          fullWidth
          icon={<Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />}
        />
      </BottomActionBar>

      <BottomSheet
        visible={sheet.open && !!sheetTile}
        onClose={closeSheet}
        title={
          sheetTile
            ? sheetTile.kind === 'available'
              ? admitTitle(ward, sheetTile.number)
              : bedLabel(ward, sheetTile.number)
            : undefined
        }
        subtitle={sheetTile ? `${ward.name} • ${sheetTile.kind === 'available' ? 'Available' : 'Occupied'}` : undefined}
        footer={
          sheetTile?.kind === 'available' ? (
            <ButtonRow>
              <Button title="Cancel" variant="outline" onPress={closeSheet} style={styles.sideBtn} />
              <Button
                title="Start admission"
                onPress={() => sheetTile && startAdmission(ward, sheetTile.number)}
                style={styles.flex}
                icon={<Ionicons name="arrow-forward" size={16} color="#FFFFFF" />}
                iconPosition="right"
              />
            </ButtonRow>
          ) : (
            <ButtonRow>
              <Button
                title="Call ward station"
                variant="outline"
                onPress={() => {
                  closeSheet();
                  afterModal(() => callNumber(hospitalProfile.phone, `${wardShortName(ward)} nursing station`));
                }}
                style={styles.flex}
                icon={<Ionicons name="call-outline" size={16} color={colors.primary} />}
              />
              <Button title="Done" onPress={closeSheet} style={styles.sideBtn} />
            </ButtonRow>
          )
        }
      >
        {sheetTile?.kind === 'available' ? (
          <View>
            <View style={styles.sheetCard}>
              <InfoRow label="Bed" value={bedLabel(ward, sheetTile.number)} icon="bed-outline" />
              <InfoRow label="Room type" value={roomTypeForWard(ward)} icon="business-outline" />
              <InfoRow label="Daily rate" value={ward.dailyRate ? formatCurrency(ward.dailyRate) : '—'} icon="pricetag-outline" />
              <InfoRow
                label="Advance"
                value={`${formatCurrency((ward.dailyRate ?? 1600) + 1000)} (1 day + nursing)`}
                icon="card-outline"
              />
              <InfoRow label="Free in ward" value={`${ward.available} of ${ward.totalBeds}`} icon="checkmark-circle-outline" last />
            </View>
            <Notice
              tone="info"
              message={`${bedLabel(ward, sheetTile.number)} is held for this admission when you save it. If another admission takes it first, you'll be asked to choose a different bed.${
                gender ? ` ${wardShortName(ward)} is the ${gender.toLowerCase()} general ward — confirm the patient's gender before admitting.` : ''
              }`}
            />
          </View>
        ) : (
          <View style={styles.occupied}>
            <View style={styles.occupiedIcon}>
              <Ionicons name="person" size={26} color={colors.textSecondary} />
            </View>
            <Text style={styles.occupiedTitle}>Occupied • patient record at ward station</Text>
            <Text style={styles.occupiedText}>
              This bed's patient hasn't been registered in CareSync yet. The ward's paper chart and nursing notes are at the{' '}
              {wardShortName(ward)} nursing station.
            </Text>
          </View>
        )}
      </BottomSheet>
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
  flex: {
    flex: 1,
  },
  sideBtn: {
    minWidth: 96,
  },
  wardGrid: {
    gap: spacing.md,
  },
  wardRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  mapCard: {
    ...cardStyle,
    padding: spacing.md,
  },
  mapSummary: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  nextFree: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.successText,
    fontWeight: typography.fontWeights.semiBold,
    marginTop: 4,
  },
  segment: {
    marginTop: spacing.md,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.base,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    ...cardStyle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minHeight: 64,
  },
  bedBadge: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bedBadgeText: {
    color: '#FFFFFF',
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.extraBold,
  },
  rowTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  rowMeta: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rowHint: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.warningText,
    marginTop: 2,
    fontWeight: typography.fontWeights.medium,
  },
  dischargeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    ...cardStyle,
  },
  sheetCard: {
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  occupied: {
    alignItems: 'center',
    paddingVertical: spacing.base,
  },
  occupiedIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  occupiedTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  occupiedText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.base,
  },
});
