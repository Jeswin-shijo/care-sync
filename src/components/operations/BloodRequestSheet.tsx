import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { BloodRequest, Patient } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import { ROLE_ACTOR } from '../../logic/hospital';
import { ROLE_LABEL } from '../../logic/access';
import { colors, spacing, typography } from '../../constants/theme';
import { BottomSheet } from '../common/BottomSheet';
import { Button } from '../common/Button';
import { PatientPicker, PatientSelectorBar } from '../common/PatientPicker';
import { BLOOD_COMPONENTS, BLOOD_GROUPS, BloodComponent, BloodGroup, isBloodGroup, isCompatible, unitsOf } from './bloodBank';
import { ChoiceChips, Field, InfoRow, Notice, QtyStepper, Segmented } from './OpsUI';
import { plural } from './utils';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Pre-selects a group, e.g. when opened from a stock card. */
  initialGroup?: BloodGroup | null;
  onCreated: (message: string) => void;
}

type Priority = BloodRequest['priority'];

export const BloodRequestSheet: React.FC<Props> = ({ visible, onClose, initialGroup, onCreated }) => {
  const { bloodStock, activeRole, getPatient, createBloodRequest, patientAppUser } = useApp();

  const [patientId, setPatientId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [group, setGroup] = useState<BloodGroup | null>(null);
  const [groupTouched, setGroupTouched] = useState(false);
  const [component, setComponent] = useState<BloodComponent>('PRBC');
  const [units, setUnits] = useState(1);
  const [priority, setPriority] = useState<Priority>('Routine');
  const [showErrors, setShowErrors] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    if (visible && initialGroup) {
      setGroup(initialGroup);
      setGroupTouched(true);
    }
  }, [visible, initialGroup]);

  const patient = getPatient(patientId);
  const recordedGroup = patient?.bloodGroup;
  const patientGroup = isBloodGroup(recordedGroup) ? recordedGroup : null;
  const stockFor = (g: BloodGroup) => bloodStock.find((s) => s.group === g);
  const available = group ? unitsOf(stockFor(group), component) : 0;
  const incompatible = !!(group && patientGroup && !isCompatible(component, group, patientGroup));
  const requestedBy = activeRole === 'patient' ? patientAppUser?.name ?? ROLE_ACTOR.patient : ROLE_ACTOR[activeRole];

  const selectPatient = (p: Patient) => {
    setPatientId(p.id);
    if (!groupTouched && isBloodGroup(p.bloodGroup)) setGroup(p.bloodGroup);
  };

  const reset = () => {
    setPatientId(null);
    setGroup(null);
    setGroupTouched(false);
    setComponent('PRBC');
    setUnits(1);
    setPriority('Routine');
    setShowErrors(false);
  };

  const submit = () => {
    if (submitting.current) return;
    setShowErrors(true);
    if (!patient || !group || incompatible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    submitting.current = true;
    createBloodRequest({ patientId: patient.id, group, component, units, priority, requestedBy });
    const message = `${plural(units, 'unit')} ${group} ${component} for ${patient.name} • awaiting cross-match`;
    reset();
    submitting.current = false;
    onCreated(message);
  };

  const groupError = showErrors && !group ? 'Choose the blood group to cross-match' : null;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="New blood request"
      subtitle="Cross-match request to the blood bank"
      maxHeight={0.92}
      footer={
        <Button
          title={priority === 'Emergency' ? 'Send emergency request' : 'Create request'}
          onPress={submit}
          variant={priority === 'Emergency' ? 'danger' : 'primary'}
          size="lg"
          fullWidth
          disabled={incompatible}
          icon={<Ionicons name="send" size={16} color="#FFFFFF" />}
        />
      }
    >
      <Field label="Patient" required error={showErrors && !patient ? 'Select the patient who needs the transfusion' : null}>
        <PatientSelectorBar patient={patient} onPress={() => setPickerOpen(true)} label="Transfusion for" />
        {!!patient && (
          <Text style={styles.recorded}>
            {patientGroup ? `Blood group on record: ${patientGroup}` : 'Blood group not on record'}
            {patient.room ? ` • ${patient.room}` : ''}
          </Text>
        )}
      </Field>

      {!!patient && !patientGroup && (
        <Notice
          tone="warning"
          message="Send a grouping sample with the cross-match — confirm the patient's group before issue."
          style={styles.notice}
        />
      )}

      <Field label="Blood group" required error={groupError}>
        <ChoiceChips
          options={BLOOD_GROUPS.map((g) => ({
            value: g,
            label: g,
            count: unitsOf(stockFor(g), component),
            tone: colors.danger,
          }))}
          value={group}
          onChange={(g) => {
            setGroup(g);
            setGroupTouched(true);
          }}
        />
      </Field>

      {!!group && !!patientGroup && group !== patientGroup && (
        <Notice
          tone={incompatible ? 'danger' : 'info'}
          title={incompatible ? 'Incompatible group' : 'Compatible substitute'}
          message={
            incompatible
              ? `${group} ${component} is not compatible with a ${patientGroup} patient. Choose ${patientGroup} or a compatible group.`
              : `Patient is ${patientGroup}. ${group} ${component} is compatible and can be cross-matched.`
          }
          style={styles.notice}
        />
      )}

      <Field label="Component" required>
        <ChoiceChips
          options={BLOOD_COMPONENTS.map((c) => ({
            value: c.component,
            label: c.component,
            count: group ? unitsOf(stockFor(group), c.component) : undefined,
          }))}
          value={component}
          onChange={setComponent}
        />
      </Field>

      <Field
        label="Units"
        required
        hint={
          group
            ? available >= units
              ? `${plural(available, 'unit')} of ${group} ${component} in stock`
              : `Only ${plural(available, 'unit')} in stock — the request will wait for stock or a donation`
            : null
        }
      >
        <QtyStepper value={units} onChange={setUnits} min={1} max={10} unit={units === 1 ? 'unit' : 'units'} />
      </Field>

      <Field label="Priority" required>
        <Segmented
          options={[
            { value: 'Routine' as Priority, label: 'Routine', icon: 'time-outline' },
            { value: 'Emergency' as Priority, label: 'Emergency', icon: 'flash', tone: colors.danger },
          ]}
          value={priority}
          onChange={setPriority}
        />
      </Field>

      <View style={styles.byCard}>
        <InfoRow label="Requested by" value={`${requestedBy} (${ROLE_LABEL[activeRole]})`} icon="person-circle-outline" last />
      </View>

      <PatientPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={selectPatient}
        selectedId={patientId}
        title="Request blood for…"
      />
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  recorded: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    marginTop: 6,
    fontWeight: typography.fontWeights.medium,
  },
  notice: {
    marginTop: -spacing.sm,
    marginBottom: spacing.base,
  },
  byCard: {
    backgroundColor: colors.cardMuted,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
  },
});
