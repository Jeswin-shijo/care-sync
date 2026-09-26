import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, radius, typography } from '../../constants/theme';

export type BadgeVariant =
  | 'confirmed'
  | 'active'
  | 'paid'
  | 'waiting'
  | 'pending'
  | 'notArrived'
  | 'admitted'
  | 'discharged'
  | 'default'
  | 'primary'
  | 'warning'
  | 'danger'
  | 'success'
  | 'info'
  | 'completed'
  | 'cancelled';

/** One mapping for every status string in the app, so colours stay consistent. */
export const statusVariant = (status: string): BadgeVariant => {
  switch (status) {
    case 'Confirmed':
    case 'Active':
    case 'Paid':
    case 'Completed':
    case 'Dispensed':
    case 'Safe':
    case 'Available':
    case 'Issued':
    case 'Reported':
    case 'Operational':
    case 'On Duty':
      return status === 'Completed' || status === 'Reported' ? 'completed' : 'success';
    case 'Waiting':
    case 'Pending':
    case 'Processing':
    case 'Pending Review':
    case 'Interaction Warning':
    case 'Pending Cross-match':
    case 'Scheduled':
    case 'On Trip':
    case 'Draft':
      return 'warning';
    case 'In Consultation':
    case 'New':
    case 'In Progress':
      return 'info';
    case 'Not Arrived':
    case 'Abnormal':
    case 'Allergy Warning':
    case 'Doctor Clarification':
    case 'Emergency':
    case 'Rejected':
      return 'danger';
    case 'Admitted':
      return 'admitted';
    case 'Discharged':
    case 'Maintenance':
    case 'Off Duty':
    case 'On Leave':
    case 'Opening Soon':
      return 'discharged';
    case 'Cancelled':
      return 'cancelled';
    default:
      return 'default';
  }
};

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  style,
  textStyle,
  size = 'md',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'confirmed':
      case 'active':
      case 'paid':
      case 'success':
        return {
          bg: colors.successLight,
          text: colors.success,
          border: colors.success + '40',
        };
      case 'waiting':
      case 'pending':
      case 'warning':
        return {
          bg: colors.warningLight,
          text: colors.warning,
          border: colors.warning + '40',
        };
      case 'notArrived':
      case 'danger':
        return {
          bg: colors.dangerLight,
          text: colors.danger,
          border: colors.danger + '40',
        };
      case 'admitted':
        return {
          bg: colors.purpleLight,
          text: colors.purple,
          border: colors.purple + '40',
        };
      case 'discharged':
        return {
          bg: colors.cardMuted,
          text: colors.textSecondary,
          border: colors.border,
        };
      case 'completed':
        return {
          bg: colors.tealLight,
          text: colors.teal,
          border: colors.teal + '40',
        };
      case 'cancelled':
        return {
          bg: colors.cardMuted,
          text: colors.textMuted,
          border: colors.border,
        };
      case 'info':
      case 'primary':
        return {
          bg: colors.primaryLight,
          text: colors.primary,
          border: colors.primary + '40',
        };
      default:
        return {
          bg: colors.cardMuted,
          text: colors.textSecondary,
          border: colors.border,
        };
    }
  };

  const vStyles = getVariantStyles();
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: vStyles.bg,
          borderColor: vStyles.border,
          paddingVertical: isSm ? 2 : 4,
          paddingHorizontal: isSm ? 6 : 10,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: vStyles.text,
            fontSize: isSm ? typography.fontSizes.xs : typography.fontSizes.sm - 1,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: typography.fontWeights.semiBold,
  },
});
