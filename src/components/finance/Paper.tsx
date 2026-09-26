import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';
import { AppLogo } from '../common/AppLogo';

/**
 * Printed-document look (receipts, bills, claim forms): white sheet, hospital
 * letterhead, label/value rows, dashed rules and a signature block.
 */
export interface PaperHospital {
  name: string;
  address: string;
  gstin: string;
  phone?: string;
}

export const Paper: React.FC<{ children: React.ReactNode; watermark?: string; style?: StyleProp<ViewStyle> }> = ({
  children,
  watermark,
  style,
}) => (
  <View style={[styles.paper, style]}>
    {!!watermark && (
      <View pointerEvents="none" style={styles.watermarkWrap}>
        <Text style={styles.watermark}>{watermark}</Text>
      </View>
    )}
    {children}
  </View>
);

export const PaperHeader: React.FC<{ hospital: PaperHospital }> = ({ hospital }) => (
  <View style={styles.header}>
    <AppLogo size={44} />
    <View style={styles.headerText}>
      <Text style={styles.hospital}>{hospital.name}</Text>
      <Text style={styles.hospitalSub}>{hospital.address}</Text>
      <Text style={styles.hospitalSub}>
        GSTIN: {hospital.gstin}
        {hospital.phone ? `  •  ${hospital.phone}` : ''}
      </Text>
    </View>
  </View>
);

export const DashedRule: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => <View style={[styles.dashed, style]} />;

export const PaperTitle: React.FC<{ title: string; subtitle?: string; right?: React.ReactNode }> = ({ title, subtitle, right }) => (
  <View style={styles.titleWrap}>
    <View style={styles.titleRow}>
      <Text style={styles.title}>{title.toUpperCase()}</Text>
      {right}
    </View>
    {!!subtitle && <Text style={styles.titleSub}>{subtitle}</Text>}
  </View>
);

export const PaperRow: React.FC<{
  label: string;
  value: string;
  bold?: boolean;
  valueStyle?: StyleProp<TextStyle>;
  onPress?: () => void;
}> = ({ label, value, bold, valueStyle, onPress }) => {
  const valueNode = (
    <Text style={[styles.value, bold && styles.valueBold, onPress && styles.link, valueStyle]} selectable={!onPress}>
      {value}
    </Text>
  );
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {onPress ? (
        <TouchableOpacity onPress={onPress} hitSlop={8} style={styles.valueTouch} accessibilityRole="link" accessibilityLabel={`${label}: ${value}`}>
          {valueNode}
        </TouchableOpacity>
      ) : (
        <View style={styles.valueTouch}>{valueNode}</View>
      )}
    </View>
  );
};

export const PaperSection: React.FC<{ title: string; children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({
  title,
  children,
  style,
}) => (
  <View style={[styles.section, style]}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

export const PaperSignature: React.FC<{ hospitalName: string; signatory: string; role?: string; footer?: string }> = ({
  hospitalName,
  signatory,
  role = 'Authorized Signatory',
  footer,
}) => (
  <>
    <DashedRule style={{ marginTop: spacing.base }} />
    <View style={styles.signRow}>
      <Text style={styles.signFor} numberOfLines={2}>
        For {hospitalName}
      </Text>
      <View style={styles.signBox}>
        <Text style={styles.signScript} numberOfLines={1} adjustsFontSizeToFit>
          {signatory}
        </Text>
        <View style={styles.signLine} />
        <Text style={styles.signRole}>{role}</Text>
      </View>
    </View>
    {!!footer && <Text style={styles.footer}>{footer}</Text>}
  </>
);

/** Rotated rubber stamp, e.g. PAID / DUE. */
export const Stamp: React.FC<{ label: string; color: string; style?: StyleProp<ViewStyle> }> = ({ label, color, style }) => (
  <View style={[styles.stamp, { borderColor: color }, style]}>
    <Text style={[styles.stampText, { color }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  paper: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.base + 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    ...shadows.md,
  },
  watermarkWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watermark: {
    fontSize: 64,
    fontWeight: typography.fontWeights.extraBold,
    color: 'rgba(30, 107, 255, 0.06)',
    letterSpacing: 8,
    transform: [{ rotate: '-24deg' }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  hospital: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  hospitalSub: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  dashed: {
    borderTopWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginVertical: spacing.md,
  },
  titleWrap: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.primary,
    letterSpacing: 1.2,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.sm,
    overflow: 'hidden',
    textAlign: 'center',
  },
  titleSub: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: spacing.md,
  },
  label: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    minWidth: 96,
  },
  valueTouch: {
    flex: 1,
    alignItems: 'flex-end',
  },
  value: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.text,
    fontWeight: typography.fontWeights.medium,
    textAlign: 'right',
  },
  valueBold: {
    fontWeight: typography.fontWeights.bold,
  },
  link: {
    color: colors.primary,
    fontWeight: typography.fontWeights.semiBold,
  },
  section: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingBottom: 4,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  signRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  signFor: {
    flex: 1,
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  signBox: {
    alignItems: 'center',
    width: 140,
  },
  signScript: {
    fontSize: typography.fontSizes.md,
    color: colors.primaryDark,
    fontStyle: 'italic',
    fontWeight: typography.fontWeights.semiBold,
    marginBottom: 2,
  },
  signLine: {
    alignSelf: 'stretch',
    height: 1,
    backgroundColor: colors.border,
  },
  signRole: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 3,
  },
  footer: {
    textAlign: 'center',
    fontSize: 10,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  stamp: {
    borderWidth: 2,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  stampText: {
    fontSize: 13,
    fontWeight: typography.fontWeights.extraBold,
    letterSpacing: 2,
  },
});
