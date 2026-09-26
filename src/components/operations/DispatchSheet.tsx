import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { Ambulance } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { BottomSheet } from '../common/BottomSheet';
import { Button } from '../common/Button';
import { PressableScale } from '../common/Motion';
import { AMBULANCE_TYPE_META, PICKUP_SUGGESTIONS, REASON_SUGGESTIONS, TripPriority } from './ambulance';
import { ChoiceChips, Field, Input, Notice, Segmented } from './OpsUI';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Vehicle chosen from its fleet card. */
  initialVehicleId?: string | null;
  /** Receives the dispatched vehicle with its trip (ETA, priority, dispatch time). */
  onDispatched: (ambulance: Ambulance) => void;
  onCallHotline: () => void;
}

const recommendedFor = (available: Ambulance[], priority: TripPriority, reason: string): Ambulance | null => {
  const neonatal = /newborn|neonat|baby|infant/i.test(reason);
  const order: Ambulance['type'][] = neonatal
    ? ['Neonatal', 'ALS', 'BLS']
    : priority === 'Routine'
    ? ['BLS', 'ALS', 'Neonatal']
    : ['ALS', 'BLS', 'Neonatal'];
  for (const type of order) {
    const match = available.find((a) => a.type === type);
    if (match) return match;
  }
  return available[0] ?? null;
};

export const DispatchSheet: React.FC<Props> = ({ visible, onClose, initialVehicleId, onDispatched, onCallHotline }) => {
  const { ambulances, dispatchAmbulance } = useApp();
  const available = useMemo(() => ambulances.filter((a) => a.status === 'Available'), [ambulances]);

  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [pickup, setPickup] = useState('');
  const [reasonChip, setReasonChip] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [priority, setPriority] = useState<TripPriority>('Emergency');
  const [showErrors, setShowErrors] = useState(false);
  const [staleVehicle, setStaleVehicle] = useState<string | null>(null);
  const submitting = useRef(false);

  const reasonText = [reasonChip, details.trim()].filter(Boolean).join(' — ');
  const recommended = recommendedFor(available, priority, reasonText);
  const selected = available.find((a) => a.id === vehicleId) ?? null;

  // Opening from a fleet card selects that vehicle; otherwise pre-select the best match.
  useEffect(() => {
    if (!visible) return;
    if (initialVehicleId && available.some((a) => a.id === initialVehicleId)) setVehicleId(initialVehicleId);
    else if (!available.some((a) => a.id === vehicleId)) setVehicleId(recommendedFor(available, priority, reasonText)?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialVehicleId]);

  const errors = {
    vehicle: !selected ? 'Choose an available ambulance' : null,
    pickup: pickup.trim().length < 3 ? 'Enter the pickup address or a landmark' : null,
    reason: !reasonText ? 'Pick a reason or describe the case' : null,
  };

  const als = available.find((a) => a.type === 'ALS');
  const needsAls = !!selected && priority === 'Emergency' && selected.type !== 'ALS' && !!als && !/newborn|neonat|baby|infant/i.test(reasonText);

  const submit = () => {
    if (submitting.current) return;
    setShowErrors(true);
    if (!selected || errors.pickup || errors.reason) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    submitting.current = true;
    const dispatched = dispatchAmbulance(selected.id, { pickup: pickup.trim(), reason: reasonText, priority });
    submitting.current = false;
    if (!dispatched) {
      // Someone else dispatched or grounded this vehicle a moment ago.
      setStaleVehicle(selected.vehicleNo);
      setVehicleId(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    setVehicleId(null);
    setPickup('');
    setReasonChip(null);
    setDetails('');
    setPriority('Emergency');
    setShowErrors(false);
    setStaleVehicle(null);
    onDispatched(dispatched);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Dispatch ambulance"
      subtitle={`${available.length} of ${ambulances.length} vehicles available`}
      maxHeight={0.92}
      footer={
        available.length ? (
          <Button
            title={selected ? `Dispatch ${selected.vehicleNo}` : 'Dispatch ambulance'}
            onPress={submit}
            variant={priority === 'Emergency' ? 'danger' : 'primary'}
            size="lg"
            fullWidth
            icon={<Ionicons name="navigate" size={17} color="#FFFFFF" />}
          />
        ) : (
          <Button
            title="Call 108 emergency network"
            onPress={onCallHotline}
            variant="danger"
            size="lg"
            fullWidth
            icon={<Ionicons name="call" size={17} color="#FFFFFF" />}
          />
        )
      }
    >
      <Field label="Priority" required>
        <Segmented
          options={[
            { value: 'Emergency' as TripPriority, label: 'Emergency', icon: 'flash', tone: colors.danger },
            { value: 'Routine' as TripPriority, label: 'Routine', icon: 'time-outline' },
          ]}
          value={priority}
          onChange={setPriority}
        />
      </Field>

      {!!staleVehicle && (
        <Notice
          tone="danger"
          message={`${staleVehicle} was dispatched or taken off the road a moment ago. Choose another vehicle.`}
          style={styles.notice}
        />
      )}

      <Field label="Ambulance" required error={showErrors ? errors.vehicle : null}>
        {available.length ? (
          <View style={styles.vehicles}>
            {available.map((a) => {
              const meta = AMBULANCE_TYPE_META[a.type];
              const active = a.id === selected?.id;
              return (
                <PressableScale
                  key={a.id}
                  onPress={() => {
                    setVehicleId(a.id);
                    setStaleVehicle(null);
                  }}
                  style={[styles.vehicle, active && styles.vehicleActive]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${a.vehicleNo}, ${meta.description}, driver ${a.driver}, at ${a.location}`}
                >
                  <View style={[styles.vehicleIcon, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon} size={18} color={meta.color} />
                  </View>
                  <View style={styles.flex}>
                    <View style={styles.vehicleTop}>
                      <Text style={styles.vehicleNo} numberOfLines={1}>
                        {a.vehicleNo}
                      </Text>
                      <Text style={[styles.vehicleType, { color: meta.color }]}>{meta.label}</Text>
                      {recommended?.id === a.id && (
                        <View style={styles.recommended}>
                          <Text style={styles.recommendedText}>Recommended</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.vehicleMeta} numberOfLines={1}>
                      {a.driver}
                      {a.paramedic ? ` + ${a.paramedic}` : ''} • {a.location}
                    </Text>
                  </View>
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={active ? colors.primary : colors.textMuted}
                  />
                </PressableScale>
              );
            })}
          </View>
        ) : (
          <Notice
            tone="danger"
            title="No ambulance available"
            message="Every vehicle is on a trip or in maintenance. Route the call to the 108 state emergency network."
          />
        )}
      </Field>

      {needsAls && als && (
        <Notice
          tone="warning"
          message={`An ALS unit (${als.vehicleNo}) is recommended for emergencies.`}
          action={{ label: 'Switch', onPress: () => setVehicleId(als.id) }}
          style={styles.notice}
        />
      )}

      <Field label="Pickup address" required error={showErrors ? errors.pickup : null}>
        <Input
          value={pickup}
          onChangeText={setPickup}
          placeholder="House / landmark, area"
          icon="location-outline"
          invalid={showErrors && !!errors.pickup}
          autoCapitalize="words"
          returnKeyType="next"
        />
        <ChoiceChips
          scroll
          bleed={spacing.lg}
          style={styles.suggestions}
          options={PICKUP_SUGGESTIONS.map((p) => ({ value: p, label: p, icon: 'location-outline' as const }))}
          value={PICKUP_SUGGESTIONS.includes(pickup.trim()) ? pickup.trim() : null}
          onChange={setPickup}
        />
      </Field>

      <Field label="Reason" required error={showErrors ? errors.reason : null}>
        <ChoiceChips
          options={REASON_SUGGESTIONS.map((r) => ({ value: r, label: r }))}
          value={reasonChip}
          onChange={(r) => setReasonChip((prev) => (prev === r ? null : r))}
        />
        <Input
          value={details}
          onChangeText={setDetails}
          placeholder="Details — age, condition, caller number"
          icon="create-outline"
          style={styles.detailsInput}
          containerStyle={styles.detailsWrap}
          invalid={showErrors && !!errors.reason}
        />
      </Field>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  vehicles: {
    gap: spacing.sm,
  },
  vehicle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  vehicleActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  vehicleIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vehicleNo: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    flexShrink: 1,
  },
  vehicleType: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.extraBold,
  },
  recommended: {
    backgroundColor: colors.successLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.successText,
  },
  vehicleMeta: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
  },
  notice: {
    marginBottom: spacing.base,
  },
  suggestions: {
    paddingTop: spacing.sm,
  },
  detailsInput: {
    fontSize: typography.fontSizes.sm + 1,
  },
  detailsWrap: {
    marginTop: spacing.md,
  },
});
