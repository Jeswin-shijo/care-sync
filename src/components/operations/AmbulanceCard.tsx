import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Ambulance } from '../../data/mockData';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { Badge, statusVariant } from '../common/Badge';
import { Button } from '../common/Button';
import { ProgressFill, PulseDot } from '../common/Motion';
import { AMBULANCE_TYPE_META, formatCountdown, PRIORITY_META, useEtaCountdown } from './ambulance';
import { cardStyle, IconAction } from './OpsUI';

interface Props {
  ambulance: Ambulance;
  onDispatch: () => void;
  onComplete: () => void;
  onMaintenance: () => void;
  onReturnToService: () => void;
  onCall: () => void;
  /** Accessibility label for the call button ("Call driver Shaji P"). */
  callLabel: string;
}

type Trip = NonNullable<Ambulance['trip']>;

const TripPanel: React.FC<{ trip: Trip }> = ({ trip }) => {
  const { remaining, progress, arrived } = useEtaCountdown(trip.etaMinutes, trip.dispatchedAt);
  const priority = trip.priority;
  const pct = Math.min(100, Math.max(0, Math.round(progress * 1000) / 10));
  const tone = arrived ? colors.success : colors.warning;

  return (
    <View style={styles.trip}>
      <View style={styles.tripRow}>
        <Ionicons name="navigate" size={15} color={colors.warningText} style={styles.tripIcon} />
        <View style={styles.flex}>
          <Text style={styles.tripLabel}>Pickup</Text>
          <Text style={styles.tripValue} numberOfLines={2}>
            {trip.pickup}
          </Text>
        </View>
      </View>
      <View style={styles.tripRow}>
        <Ionicons name="medkit-outline" size={15} color={colors.warningText} style={styles.tripIcon} />
        <View style={styles.flex}>
          <Text style={styles.tripLabel}>Reason</Text>
          <Text style={styles.tripValue} numberOfLines={2}>
            {trip.reason}
          </Text>
        </View>
        {!!priority && (
          <View style={[styles.priority, { backgroundColor: PRIORITY_META[priority].bg, borderColor: PRIORITY_META[priority].color + '33' }]}>
            <Text style={[styles.priorityText, { color: PRIORITY_META[priority].color }]}>{priority}</Text>
          </View>
        )}
      </View>

      <View style={styles.etaRow} accessible accessibilityLiveRegion="polite" accessibilityLabel={arrived ? 'Arriving at pickup' : `ETA ${Math.ceil(remaining / 60)} minutes`}>
        <PulseDot color={tone} size={8} />
        <Text style={[styles.etaValue, { color: arrived ? colors.successText : colors.text }]}>
          {arrived ? 'Arriving' : formatCountdown(remaining)}
        </Text>
        <Text style={styles.etaSub}>{arrived ? 'Crew at the pickup point' : 'ETA to pickup'}</Text>
      </View>

      <View style={styles.track}>
        <ProgressFill progress={progress} color={tone} height={6} trackColor="#FFFFFF" />
        <View style={styles.lane} pointerEvents="none">
          <View style={[styles.vehicleMarker, { left: `${pct}%` }]}>
            <Ionicons name="car" size={13} color={arrived ? colors.success : colors.warningText} />
          </View>
        </View>
      </View>
      <View style={styles.trackLabels}>
        <Text style={styles.trackLabel}>Dispatched</Text>
        <Text style={styles.trackLabel} numberOfLines={1}>
          Pickup
        </Text>
      </View>
    </View>
  );
};

export const AmbulanceCard: React.FC<Props> = ({ ambulance: a, onDispatch, onComplete, onMaintenance, onReturnToService, onCall, callLabel }) => {
  const type = AMBULANCE_TYPE_META[a.type];
  const onTrip = a.status === 'On Trip';

  return (
    <View style={[styles.card, onTrip && styles.cardTrip, a.status === 'Maintenance' && styles.cardMuted]}>
      <View style={styles.top}>
        <View style={[styles.typeIcon, { backgroundColor: type.bg }]}>
          <Ionicons name="car" size={20} color={type.color} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.vehicle} numberOfLines={1}>
            {a.vehicleNo}
          </Text>
          <View style={styles.typeRow}>
            <View style={[styles.typePill, { backgroundColor: type.bg }]}>
              <Ionicons name={type.icon} size={11} color={type.color} />
              <Text style={[styles.typeText, { color: type.color }]}>{type.label}</Text>
            </View>
            <Text style={styles.typeDesc} numberOfLines={1}>
              {type.description}
            </Text>
          </View>
        </View>
        <Badge label={a.status} variant={statusVariant(a.status)} size="sm" />
      </View>

      <View style={styles.crew}>
        <View style={styles.crewItem}>
          <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.crewText} numberOfLines={1}>
            {a.driver} <Text style={styles.crewRole}>• Driver</Text>
          </Text>
        </View>
        {!!a.paramedic && (
          <View style={styles.crewItem}>
            <Ionicons name="medkit-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.crewText} numberOfLines={1}>
              {a.paramedic} <Text style={styles.crewRole}>• Paramedic</Text>
            </Text>
          </View>
        )}
      </View>

      <View style={styles.location}>
        <Ionicons name={a.status === 'Maintenance' ? 'construct-outline' : 'location-outline'} size={14} color={colors.textMuted} />
        <Text style={styles.locationText} numberOfLines={1}>
          {a.location}
        </Text>
      </View>

      {onTrip && a.trip && <TripPanel trip={a.trip} />}

      <View style={styles.actions}>
        <IconAction icon="call" onPress={onCall} accessibilityLabel={callLabel} />
        {a.status === 'Available' && (
          <>
            <Button title="Maintenance" variant="outline" size="sm" onPress={onMaintenance} style={styles.action} />
            <Button
              title="Dispatch"
              size="sm"
              onPress={onDispatch}
              style={styles.action}
              icon={<Ionicons name="navigate" size={15} color="#FFFFFF" />}
            />
          </>
        )}
        {onTrip && (
          <Button
            title="Complete trip"
            size="sm"
            onPress={onComplete}
            style={styles.action}
            icon={<Ionicons name="checkmark-done" size={16} color="#FFFFFF" />}
          />
        )}
        {a.status === 'Maintenance' && (
          <Button
            title="Return to service"
            variant="outline"
            size="sm"
            onPress={onReturnToService}
            style={styles.action}
            icon={<Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  card: {
    ...cardStyle,
    padding: spacing.md,
  },
  cardTrip: {
    borderColor: colors.warning + '66',
  },
  cardMuted: {
    backgroundColor: '#FBFCFE',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.text,
    letterSpacing: 0.3,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
  typeText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.extraBold,
  },
  typeDesc: {
    flex: 1,
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  crew: {
    marginTop: spacing.md,
    gap: 6,
  },
  crewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  crewText: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    color: colors.text,
    fontWeight: typography.fontWeights.medium,
  },
  crewRole: {
    color: colors.textMuted,
    fontWeight: typography.fontWeights.regular,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  locationText: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
  },
  trip: {
    marginTop: spacing.md,
    backgroundColor: colors.warningLight,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  tripIcon: {
    marginTop: 2,
  },
  tripLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.warningText,
    fontWeight: typography.fontWeights.bold,
  },
  tripValue: {
    fontSize: typography.fontSizes.sm,
    color: colors.text,
    fontWeight: typography.fontWeights.semiBold,
    marginTop: 1,
  },
  priority: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'center',
  },
  priorityText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.extraBold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  etaValue: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.extraBold,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  etaSub: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 1,
    color: colors.warningText,
    fontWeight: typography.fontWeights.medium,
  },
  track: {
    height: 18,
    justifyContent: 'center',
  },
  lane: {
    position: 'absolute',
    left: 0,
    right: 18,
    top: 0,
    bottom: 0,
  },
  vehicleMarker: {
    position: 'absolute',
    top: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.warning + '66',
  },
  trackLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -2,
  },
  trackLabel: {
    fontSize: 10,
    color: colors.warningText,
    fontWeight: typography.fontWeights.medium,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  action: {
    flex: 1,
    minHeight: 44,
  },
});
