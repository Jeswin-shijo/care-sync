import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing, typography } from '../../constants/theme';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
}) => {
  const handlePress = () => {
    if (disabled || loading) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      // Haptics fallback on web or unsupported devices
    }
    onPress();
  };

  const getVariantStyles = (): { btn: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'secondary':
        return {
          btn: { backgroundColor: colors.secondaryLight, borderWidth: 0 },
          text: { color: colors.secondary },
        };
      case 'outline':
        return {
          btn: {
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: colors.primary,
          },
          text: { color: colors.primary },
        };
      case 'ghost':
        return {
          btn: { backgroundColor: 'transparent', borderWidth: 0 },
          text: { color: colors.primary },
        };
      case 'danger':
        return {
          btn: { backgroundColor: colors.danger, borderWidth: 0 },
          text: { color: '#FFFFFF' },
        };
      case 'primary':
      default:
        return {
          btn: { backgroundColor: colors.primary, borderWidth: 0 },
          text: { color: '#FFFFFF' },
        };
    }
  };

  const getSizeStyles = (): { btn: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'sm':
        return {
          btn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.md },
          text: { fontSize: typography.fontSizes.sm },
        };
      case 'lg':
        return {
          btn: { paddingVertical: 16, paddingHorizontal: 24, borderRadius: radius.lg },
          text: { fontSize: typography.fontSizes.md + 1 },
        };
      case 'md':
      default:
        return {
          btn: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: radius.md },
          text: { fontSize: typography.fontSizes.md },
        };
    }
  };

  const vStyle = getVariantStyles();
  const sStyle = getSizeStyles();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.base,
        vStyle.btn,
        sStyle.btn,
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={vStyle.text.color} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && <View style={styles.leftIcon}>{icon}</View>}
          <Text style={[styles.text, vStyle.text, sStyle.text, textStyle]}>{title}</Text>
          {icon && iconPosition === 'right' && <View style={styles.rightIcon}>{icon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  rightIcon: {
    marginLeft: spacing.sm,
  },
  text: {
    fontWeight: typography.fontWeights.semiBold,
    textAlign: 'center',
  },
});
