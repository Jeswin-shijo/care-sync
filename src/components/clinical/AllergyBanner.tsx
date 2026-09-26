import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { PulseDot } from '../common/Motion';

interface AllergyBannerProps {
  /** undefined = no clinical profile on record (status unknown). */
  allergies: string[] | undefined;
  /** Show a green "NKDA" line when the list is empty (default true). */
  showNone?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Red allergy alert shown wherever a clinician can prescribe or admit.
 * Never assumes NKDA when there is no profile — that is shown as "not recorded".
 */
export const AllergyBanner: React.FC<AllergyBannerProps> = ({ allergies, showNone = true, compact, style }) => {
  if (allergies === undefined) {
    return (
      <View style={[styles.base, styles.unknown, compact && styles.compact, style]} accessibilityRole="alert">
        <Ionicons name="help-circle" size={18} color={colors.warning} />
        <Text style={[styles.unknownText, compact && styles.smallText]}>
          Allergy status not recorded — confirm with the patient before prescribing.
        </Text>
      </View>
    );
  }
  if (!allergies.length) {
    if (!showNone) return null;
    return (
      <View style={[styles.base, styles.none, compact && styles.compact, style]}>
        <Ionicons name="shield-checkmark" size={16} color={colors.success} />
        <Text style={[styles.noneText, compact && styles.smallText]}>No known drug allergies (NKDA)</Text>
      </View>
    );
  }
  return (
    <View
      style={[styles.base, styles.alert, compact && styles.compact, style]}
      accessibilityRole="alert"
      accessibilityLabel={`Allergy alert: ${allergies.join(', ')}`}
    >
      <View style={styles.alertIcon}>
        <Ionicons name="warning" size={18} color="#FFFFFF" />
      </View>
      <View style={styles.alertBody}>
        <View style={styles.alertHead}>
          <Text style={styles.alertLabel}>ALLERGY ALERT</Text>
          <PulseDot color={colors.danger} size={7} />
        </View>
        <Text style={[styles.alertText, compact && styles.smallText]}>{allergies.join(' • ')}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  compact: { paddingVertical: spacing.sm },
  alert: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger + '55',
  },
  alertIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertBody: { flex: 1 },
  alertHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  alertLabel: {
    fontSize: 10.5,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.danger,
    letterSpacing: 0.8,
  },
  alertText: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.dangerText,
    marginTop: 1,
  },
  none: {
    backgroundColor: colors.successLight,
    borderColor: colors.success + '40',
  },
  noneText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.successText,
  },
  unknown: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warning + '55',
  },
  unknownText: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.warningText,
  },
  smallText: { fontSize: typography.fontSizes.xs + 1 },
});
