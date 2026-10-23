import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../constants/theme';
import { useIsPreview } from './previewContext';
import { useAlert } from '../../context/AlertContext';

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightAction?: React.ReactNode;
  titleComponent?: React.ReactNode;
  style?: ViewStyle;
  safeAreaTop?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = true,
  onBackPress,
  rightAction,
  titleComponent,
  style,
  safeAreaTop = false,
}) => {
  const insets = useSafeAreaInsets();
  const preview = useIsPreview();
  const { showAlert } = useAlert();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      // Opened from a deep link / notification with no history — go home.
      router.replace('/(tabs)');
    }
  };

  const topPadding = safeAreaTop
    ? Math.max(insets.top, Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) : 0)
    : 0;

  const header = (
    <View
      style={[
        styles.container,
        topPadding > 0 && { paddingTop: topPadding + spacing.xs },
        style,
      ]}
    >
      <View style={styles.leftContainer}>
        {showBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
        )}
        {titleComponent ? (
          <View style={styles.titleComponentWrapper}>{titleComponent}</View>
        ) : (
          <View style={styles.titleContainer}>
            {!!title && (
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            )}
            {!!subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
        )}
      </View>

      {rightAction && <View style={styles.rightContainer}>{rightAction}</View>}
    </View>
  );

  if (!preview) return header;
  return (
    <>
      {header}
      <TouchableOpacity
        style={styles.preview}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Preview: sample data, nothing is saved. Tap for details."
        onPress={() =>
          showAlert({
            title: 'Preview module',
            message:
              'This module is not connected to the hospital server yet. It runs on a sample hospital so you can try it: nothing here comes from or is saved to your hospital records.',
            type: 'info',
          })
        }
      >
        <Ionicons name="flask-outline" size={14} color={colors.warningText} />
        <Text style={styles.previewText}>Preview • sample data, nothing is saved</Text>
        <Ionicons name="information-circle-outline" size={15} color={colors.warningText} />
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
    minHeight: 56,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight || '#F1F5F9',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: spacing.sm + 2,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleComponentWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: typography.fontWeights.medium,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.warningLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.warning + '40',
  },
  previewText: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.warningText,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 38,
    marginLeft: spacing.sm,
  },
});
