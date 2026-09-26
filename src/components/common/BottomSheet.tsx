import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { formScrollProps, useKeyboardHeight } from './KeyboardAware';
import { ToastHost } from '../../context/ToastContext';

const SCREEN_H = Dimensions.get('window').height;

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Sticky footer (primary action). */
  footer?: React.ReactNode;
  /** Max height as a share of the screen (default 0.85). */
  maxHeight?: number;
  /** Wrap children in a ScrollView (default true). */
  scroll?: boolean;
  /** Tapping the backdrop closes the sheet (default true). */
  dismissible?: boolean;
  /** Called once the close animation has finished and the modal is gone — safe to navigate or open another modal. */
  onDismissed?: () => void;
}

/** Slide-up sheet with backdrop fade, used for pickers, forms and confirmations. */
export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxHeight = 0.85,
  scroll = true,
  dismissible = true,
  onDismissed,
}) => {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const [mounted, setMounted] = useState(visible);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 4 }).start();
    } else if (mounted) {
      Animated.timing(anim, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(
        ({ finished }) => {
          if (finished) {
            setMounted(false);
            onDismissed?.();
          }
        }
      );
    }
  }, [visible]);

  if (!mounted) return null;

  const body = scroll ? (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} {...formScrollProps}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.scrollContent, { flexShrink: 1 }]}>{children}</View>
  );

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: anim }]}>
          <Pressable style={styles.fill} onPress={dismissible ? onClose : undefined} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            {
              // Keep the whole sheet (header + footer) below the status bar when the keyboard is up.
              maxHeight: keyboard
                ? Math.min(SCREEN_H * maxHeight, SCREEN_H - keyboard - insets.top - spacing.base)
                : SCREEN_H * maxHeight,
              paddingBottom: footer ? 0 : Math.max(insets.bottom, spacing.base),
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_H * 0.6, 0] }) }],
            },
          ]}
        >
          <View style={styles.handle} />
          {(title || subtitle) && (
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                {!!title && <Text style={styles.title}>{title}</Text>}
                {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
              </View>
              <TouchableOpacity onPress={onClose} style={styles.close} hitSlop={10} accessibilityLabel="Close sheet">
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
          {body}
          {footer ? <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>{footer}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
      <ToastHost />
    </Modal>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radius.xl + 4,
    borderTopRightRadius: radius.xl + 4,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flexGrow: 0 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.base,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
});
