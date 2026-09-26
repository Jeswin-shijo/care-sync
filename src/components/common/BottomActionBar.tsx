import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, shadows, spacing } from '../../constants/theme';
import { useKeyboardHeight } from './KeyboardAware';

/**
 * Bottom inset a sticky action bar needs so it clears the Android gesture bar /
 * iOS home indicator. Screens inside the tab navigator pass `false` because the
 * tab bar already sits below them.
 */
export const useBottomInset = (safeBottom = true) => {
  const insets = useSafeAreaInsets();
  return safeBottom ? Math.max(insets.bottom, spacing.sm) : 0;
};

/** Scroll padding that keeps the last list item visible above a BottomActionBar. */
export const useBottomBarSpace = (barHeight = 76, safeBottom = true) => barHeight + useBottomInset(safeBottom);

interface BottomActionBarProps {
  children: React.ReactNode;
  /** Add the device's bottom safe-area inset (false inside tab screens). */
  safeBottom?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Sticky footer for a screen's primary action(s). */
export const BottomActionBar: React.FC<BottomActionBarProps> = ({ children, safeBottom = true, style }) => {
  const inset = useBottomInset(safeBottom);
  const keyboardOpen = useKeyboardHeight() > 0;
  return <View style={[styles.bar, { paddingBottom: spacing.md + (keyboardOpen ? 0 : inset) }, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    ...shadows.md,
  },
});
