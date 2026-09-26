import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LabSample } from '../../data/mockData';
import { relativeDayLabel } from '../../utils/dates';
import { colors, typography } from '../../constants/theme';
import { PulseDot } from '../common/Motion';

interface Step {
  label: string;
  sub: string;
  done: boolean;
  current: boolean;
}

const stepsFor = (s: LabSample): Step[] => {
  // Number of completed stages: Ordered (1) → Collected (2) → Verified (3).
  const stage = s.status === 'New' ? 1 : s.status === 'Processing' ? 2 : 3;
  const collected = s.collectedAt && s.collectedAt !== '—' ? s.collectedAt : null;
  return [
    { label: 'Ordered', sub: s.date ? relativeDayLabel(s.date) : 'Today', done: true, current: false },
    {
      label: 'Collected',
      sub: stage >= 2 ? collected ?? 'Received' : 'Awaiting',
      done: stage >= 2,
      current: stage === 1,
    },
    {
      label: 'Verified',
      sub: stage === 3 ? (s.status === 'Abnormal' ? 'Flagged' : 'Released') : stage === 2 ? 'In analyzer' : 'Pending',
      done: stage === 3,
      current: stage === 2,
    },
  ];
};

/** Ordered → Collected/Processing → Verified progress for a lab sample. */
export const SampleStepper: React.FC<{ sample: LabSample }> = ({ sample }) => {
  const steps = stepsFor(sample);
  const doneColor = (i: number) => (i === 2 && sample.status === 'Abnormal' ? colors.danger : colors.success);
  return (
    <View style={styles.row} accessibilityLabel={`Sample progress: ${steps.map((s) => `${s.label} ${s.done ? 'done' : s.current ? 'in progress' : 'pending'}`).join(', ')}`}>
      {steps.map((st, i) => (
        <React.Fragment key={st.label}>
          <View style={styles.step}>
            <View
              style={[
                styles.node,
                st.done && { backgroundColor: doneColor(i), borderColor: doneColor(i) },
                st.current && styles.nodeCurrent,
              ]}
            >
              {st.done ? (
                <Ionicons name={i === 2 && sample.status === 'Abnormal' ? 'alert' : 'checkmark'} size={11} color="#FFFFFF" />
              ) : st.current ? (
                <PulseDot size={6} color={colors.primary} />
              ) : null}
            </View>
            <Text style={[styles.label, (st.done || st.current) && styles.labelActive]}>{st.label}</Text>
            <Text style={styles.sub} numberOfLines={1}>
              {st.sub}
            </Text>
          </View>
          {i < steps.length - 1 && (
            <View style={[styles.connector, steps[i + 1].done || steps[i + 1].current ? { backgroundColor: colors.success } : null]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
};

const NODE = 20;
const STEP_W = 76;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  step: {
    width: STEP_W,
    alignItems: 'center',
  },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCurrent: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  connector: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.border,
    marginTop: NODE / 2 - 1,
    // Reach under the step columns so the line runs node-edge to node-edge.
    marginHorizontal: -(STEP_W / 2 - NODE / 2 - 4),
  },
  label: {
    marginTop: 4,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textMuted,
  },
  labelActive: {
    color: colors.text,
  },
  sub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
});
