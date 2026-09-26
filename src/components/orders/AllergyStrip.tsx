import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Patient } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import { colors, radius, spacing, typography } from '../../constants/theme';

/** One-line allergy / admission context under a patient selector. */
export const AllergyStrip: React.FC<{ patient: Patient | null | undefined; style?: StyleProp<ViewStyle> }> = ({ patient, style }) => {
  const { getProfile } = useApp();
  if (!patient) return null;
  const allergies = (getProfile(patient.id)?.allergies ?? []).filter((a) => a && !/^none$/i.test(a));
  return (
    <View style={[styles.row, style]}>
      {allergies.length ? (
        <View style={[styles.pill, styles.pillDanger]} accessibilityLabel={`Allergies: ${allergies.join(', ')}`}>
          <Ionicons name="alert-circle" size={13} color={colors.danger} />
          <Text style={[styles.text, { color: colors.dangerText }]} numberOfLines={1}>
            Allergy: {allergies.join(', ')}
          </Text>
        </View>
      ) : (
        <View style={[styles.pill, styles.pillOk]}>
          <Ionicons name="shield-checkmark-outline" size={13} color={colors.success} />
          <Text style={[styles.text, { color: colors.successText }]}>No known allergies</Text>
        </View>
      )}
      {patient.status === 'Admitted' && (
        <View style={[styles.pill, styles.pillIpd]}>
          <Ionicons name="bed-outline" size={13} color={colors.purple} />
          <Text style={[styles.text, { color: colors.purple }]} numberOfLines={1}>
            {patient.room ?? 'Admitted'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    maxWidth: '100%',
  },
  pillDanger: { backgroundColor: colors.dangerLight },
  pillOk: { backgroundColor: colors.successLight },
  pillIpd: { backgroundColor: colors.purpleLight },
  text: { fontSize: 11.5, fontWeight: typography.fontWeights.semiBold, flexShrink: 1 },
});
