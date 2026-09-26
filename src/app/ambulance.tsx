import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { Ambulance } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { SectionHeader } from '../components/common/SectionHeader';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';
import { BottomActionBar, useBottomBarSpace } from '../components/common/BottomActionBar';
import { FadeInView, PressableScale, stagger } from '../components/common/Motion';
import { AmbulanceCard } from '../components/operations/AmbulanceCard';
import { DispatchSheet } from '../components/operations/DispatchSheet';
import { STATUS_ORDER } from '../components/operations/ambulance';
import { KpiRow } from '../components/operations/OpsUI';
import { afterModal, callNumber, plural } from '../components/operations/utils';

const HOTLINE = '108';

export default function AmbulanceRoute() {
  const { ambulances, completeAmbulanceTrip, setAmbulanceMaintenance, hospitalProfile } = useApp();
  const { showToast } = useToast();
  const barSpace = useBottomBarSpace();
  const [dispatch, setDispatch] = useState<{ open: boolean; vehicleId: string | null }>({ open: false, vehicleId: null });

  const counts = useMemo(
    () => ({
      available: ambulances.filter((a) => a.status === 'Available').length,
      onTrip: ambulances.filter((a) => a.status === 'On Trip').length,
      maintenance: ambulances.filter((a) => a.status === 'Maintenance').length,
    }),
    [ambulances]
  );

  const sorted = useMemo(
    () => ambulances.map((a, i) => ({ a, i })).sort((x, y) => STATUS_ORDER[x.a.status] - STATUS_ORDER[y.a.status] || x.i - y.i).map((x) => x.a),
    [ambulances]
  );
  const liveTrips = sorted.filter((a) => a.status === 'On Trip');
  const fleet = sorted.filter((a) => a.status !== 'On Trip');

  const callHotline = () => callNumber(HOTLINE, 'Emergency hotline');
  // Crew numbers come from the fleet record; vehicles without one route to the desk.
  const callCrew = (a: Ambulance) =>
    a.driverPhone ? callNumber(a.driverPhone, `Driver ${a.driver}`) : callNumber(hospitalProfile.phone, 'Ambulance desk');

  const confirmComplete = (a: Ambulance) =>
    Alert.alert(
      'Confirm trip completion',
      `Mark ${a.vehicleNo} as back at base?\n\n• Patient handed over at Emergency\n• Vehicle cleaned and restocked`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: () => {
            completeAmbulanceTrip(a.id);
            showToast({ title: 'Trip completed', message: `${a.vehicleNo} is available at Emergency Bay 1`, type: 'success' });
          },
        },
      ]
    );

  const confirmMaintenance = (a: Ambulance) =>
    Alert.alert('Confirm maintenance', `Take ${a.vehicleNo} out of service? It can't be dispatched until it returns to service.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send to service',
        style: 'destructive',
        onPress: () => {
          setAmbulanceMaintenance(a.id, false);
          showToast({ title: 'Sent for maintenance', message: `${a.vehicleNo} • Service Centre, Kalamassery`, type: 'info', icon: 'construct' });
        },
      },
    ]);

  const returnToService = (a: Ambulance) => {
    setAmbulanceMaintenance(a.id, true);
    showToast({ title: 'Back in service', message: `${a.vehicleNo} is available at Main Block Bay 2`, type: 'success' });
  };

  const renderCard = (a: Ambulance, i: number) => (
    <FadeInView key={a.id} delay={stagger(i)}>
      <AmbulanceCard
        ambulance={a}
        onDispatch={() => setDispatch({ open: true, vehicleId: a.id })}
        onComplete={() => confirmComplete(a)}
        onMaintenance={() => confirmMaintenance(a)}
        onReturnToService={() => returnToService(a)}
        onCall={() => callCrew(a)}
        callLabel={a.driverPhone ? `Call driver ${a.driver}, ${a.driverPhone}` : `Call the ambulance desk about ${a.vehicleNo}`}
      />
    </FadeInView>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header
        title="Ambulance"
        subtitle={`${plural(ambulances.length, 'vehicle')} • ${counts.available} ready for dispatch`}
        showBack
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: barSpace + spacing.base }]}>
        <KpiRow
          items={[
            { key: 'available', label: 'Available', value: counts.available, icon: 'checkmark-circle', color: colors.success, bg: colors.successLight, sub: 'Ready at base' },
            { key: 'trip', label: 'On trip', value: counts.onTrip, icon: 'navigate', color: colors.warning, bg: colors.warningLight, sub: 'En route' },
            { key: 'maint', label: 'Maintenance', value: counts.maintenance, icon: 'construct', color: colors.textSecondary, bg: colors.cardMuted, sub: 'Off the road' },
          ]}
        />

        <FadeInView delay={160}>
          <LinearGradient colors={['#EF4444', '#B91C1C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hotline}>
            <View style={styles.hotlineIcon}>
              <Ionicons name="call" size={22} color={colors.danger} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.hotlineLabel}>Emergency hotline</Text>
              <Text style={styles.hotlineNumber}>{HOTLINE}</Text>
              <Text style={styles.hotlineSub}>Free 24×7 state ambulance network</Text>
            </View>
            <PressableScale onPress={callHotline} haptic style={styles.hotlineBtn} accessibilityRole="button" accessibilityLabel="Call 108 emergency hotline">
              <Text style={styles.hotlineBtnText}>Call {HOTLINE}</Text>
            </PressableScale>
          </LinearGradient>
          <PressableScale
            onPress={() => callNumber(hospitalProfile.phone, 'Ambulance desk')}
            style={styles.desk}
            accessibilityRole="button"
            accessibilityLabel={`Call the ambulance desk at ${hospitalProfile.phone}`}
          >
            <Ionicons name="headset-outline" size={18} color={colors.primary} />
            <Text style={styles.deskText} numberOfLines={1}>
              Ambulance desk • {hospitalProfile.phone}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </PressableScale>
        </FadeInView>

        {liveTrips.length > 0 && (
          <>
            <SectionHeader title="Live trips" meta={`${liveTrips.length} en route`} />
            <View style={styles.list}>{liveTrips.map(renderCard)}</View>
          </>
        )}

        <SectionHeader title="Fleet" meta={`${counts.available} available • ${counts.maintenance} in service`} />
        <View style={styles.list}>
          {fleet.length ? (
            fleet.map((a, i) => renderCard(a, i + liveTrips.length))
          ) : (
            <EmptyState icon="car-outline" title="Every vehicle is out on a trip" description="Vehicles appear here as they return to base." />
          )}
        </View>
      </ScrollView>

      <BottomActionBar>
        <Button
          title="Dispatch ambulance"
          onPress={() => setDispatch({ open: true, vehicleId: null })}
          size="lg"
          fullWidth
          icon={<Ionicons name="navigate" size={18} color="#FFFFFF" />}
        />
      </BottomActionBar>

      <DispatchSheet
        visible={dispatch.open}
        initialVehicleId={dispatch.vehicleId}
        onClose={() => setDispatch((d) => ({ ...d, open: false }))}
        onCallHotline={() => {
          setDispatch((d) => ({ ...d, open: false }));
          afterModal(callHotline);
        }}
        onDispatched={(a) => {
          setDispatch({ open: false, vehicleId: null });
          showToast({
            title: a.trip?.priority === 'Emergency' ? 'Emergency dispatch' : 'Ambulance dispatched',
            message: `${a.vehicleNo} → ${a.trip?.pickup ?? 'pickup'} • ETA ${a.trip?.etaMinutes ?? '—'} min`,
            type: 'success',
            icon: 'navigate',
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
  flex: {
    flex: 1,
  },
  hotline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginTop: spacing.md,
    ...shadows.md,
  },
  hotlineIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotlineLabel: {
    fontSize: typography.fontSizes.xs + 1,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: typography.fontWeights.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hotlineNumber: {
    fontSize: typography.fontSizes.xxl + 2,
    color: '#FFFFFF',
    fontWeight: typography.fontWeights.extraBold,
    letterSpacing: 1,
  },
  hotlineSub: {
    fontSize: typography.fontSizes.xs,
    color: 'rgba(255,255,255,0.85)',
  },
  hotlineBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.full,
    paddingHorizontal: spacing.base,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotlineBtnText: {
    color: colors.danger,
    fontWeight: typography.fontWeights.extraBold,
    fontSize: typography.fontSizes.sm + 1,
  },
  desk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  deskText: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    color: colors.text,
    fontWeight: typography.fontWeights.semiBold,
  },
  list: {
    gap: spacing.md,
  },
});
