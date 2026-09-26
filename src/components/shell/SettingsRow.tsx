import React from 'react';
import { Pressable, StyleProp, StyleSheet, Switch, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

interface SettingsGroupProps {
  title?: string;
  /** Small text under the group title. */
  caption?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** A titled white card whose rows are separated by hairlines. */
export const SettingsGroup: React.FC<SettingsGroupProps> = ({ title, caption, children, style }) => {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={style}>
      {!!title && <Text style={styles.groupTitle}>{title}</Text>}
      {!!caption && <Text style={styles.groupCaption}>{caption}</Text>}
      <View style={styles.card}>
        {rows.map((row, i) => (
          <React.Fragment key={i}>
            {i > 0 && <View style={styles.divider} />}
            {row}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
};

interface SettingsRowProps {
  icon: IconName;
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  /** Custom trailing element (switch, value, badge…). */
  right?: React.ReactNode;
  /** Defaults to true when the row is pressable and has no custom trailing element. */
  showChevron?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  iconColor = colors.primary,
  iconBg = colors.primaryLight,
  title,
  subtitle,
  onPress,
  right,
  showChevron,
  disabled,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const chevron = showChevron ?? (!!onPress && !right);
  const content = (
    <>
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {right}
      {chevron && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
    </>
  );

  if (!onPress) {
    return (
      <View style={[styles.row, disabled && styles.disabled]} accessible accessibilityLabel={accessibilityLabel ?? `${title}${subtitle ? `, ${subtitle}` : ''}`}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      android_ripple={{ color: colors.cardMuted }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${title}${subtitle ? `, ${subtitle}` : ''}`}
      accessibilityHint={accessibilityHint}
    >
      {content}
    </Pressable>
  );
};

interface ToggleRowProps extends Omit<SettingsRowProps, 'right' | 'onPress' | 'showChevron'> {
  value: boolean;
  onValueChange: (next: boolean) => void;
  /** When set, tapping the text opens details while the switch toggles. */
  onPress?: () => void;
}

/** Row with a switch. The whole row toggles unless `onPress` opens a detail screen. */
export const ToggleRow: React.FC<ToggleRowProps> = ({ value, onValueChange, onPress, disabled, title, ...rest }) => (
  <SettingsRow
    {...rest}
    title={title}
    disabled={disabled}
    onPress={onPress ?? (() => onValueChange(!value))}
    showChevron={false}
    accessibilityLabel={`${title}, ${value ? 'on' : 'off'}`}
    accessibilityHint={onPress ? 'Opens details. Use the switch to turn it on or off.' : 'Double tap to toggle'}
    right={
      <View style={styles.switchWrap}>
        {onPress && <View style={styles.switchDivider} />}
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{ false: colors.border, true: '#93C5FD' }}
          thumbColor={value ? colors.primary : '#FFFFFF'}
          ios_backgroundColor={colors.border}
          accessibilityLabel={`${title} switch`}
        />
      </View>
    }
  />
);

const styles = StyleSheet.create({
  groupTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  groupCaption: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    marginTop: -4,
    marginBottom: spacing.sm,
    lineHeight: 17,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    ...shadows.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginLeft: 64,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 60,
  },
  pressed: {
    backgroundColor: '#F8FAFC',
  },
  disabled: {
    opacity: 0.5,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  switchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  switchDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
});
