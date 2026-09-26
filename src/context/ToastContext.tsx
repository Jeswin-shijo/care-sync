import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';

export type ToastType = 'success' | 'info' | 'warning' | 'danger';

export interface ToastOptions {
  message: string;
  title?: string;
  type?: ToastType;
  icon?: keyof typeof Ionicons.glyphMap;
  action?: { label: string; onPress: () => void };
  duration?: number;
}

interface ToastContextType {
  showToast: (options: ToastOptions | string) => void;
}

interface ToastStateType {
  toast: (ToastOptions & { key: number }) | null;
  anim: Animated.Value;
  hide: () => void;
}

const ToastStateContext = createContext<ToastStateType | undefined>(undefined);

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const TYPE_STYLES: Record<ToastType, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  success: { icon: 'checkmark-circle', color: colors.success, bg: colors.successLight },
  info: { icon: 'information-circle', color: colors.primary, bg: colors.primaryLight },
  warning: { icon: 'warning', color: colors.warning, bg: colors.warningLight },
  danger: { icon: 'alert-circle', color: colors.danger, bg: colors.dangerLight },
};

/**
 * Lightweight, non-blocking confirmations ("Added to bill", "Vitals saved").
 * Blocking decisions still go through Alert.alert / CustomAlert.
 */
export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<(ToastOptions & { key: number }) | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setToast(null);
    });
  }, [anim]);

  const showToast = useCallback(
    (options: ToastOptions | string) => {
      const opts: ToastOptions = typeof options === 'string' ? { message: options } : options;
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setToast({ type: 'success', ...opts, key: Date.now() });
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 7 }).start();
      if ((opts.type ?? 'success') === 'danger' || opts.type === 'warning') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      hideTimer.current = setTimeout(hide, opts.duration ?? 2600);
    },
    [anim, hide]
  );

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      <ToastStateContext.Provider value={{ toast, anim, hide }}>
        {children}
        <ToastHost />
      </ToastStateContext.Provider>
    </ToastContext.Provider>
  );
};

/**
 * Renders the current toast. The provider mounts one at the root; BottomSheet
 * (a native Modal, drawn above everything) mounts another so toasts stay
 * visible while a sheet is open.
 */
export const ToastHost: React.FC = () => {
  const insets = useSafeAreaInsets();
  const ctx = useContext(ToastStateContext);
  if (!ctx?.toast) return null;
  const { toast, anim, hide } = ctx;
  const cfg = TYPE_STYLES[toast.type ?? 'success'];
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          top: insets.top + spacing.sm,
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
        },
      ]}
    >
      <Pressable onPress={hide} style={styles.toast} accessibilityRole="alert">
        <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
          <Ionicons name={toast.icon ?? cfg.icon} size={18} color={cfg.color} />
        </View>
        <View style={styles.textWrap}>
          {toast.title ? <Text style={styles.title}>{toast.title}</Text> : null}
          <Text style={styles.message} numberOfLines={3}>
            {toast.message}
          </Text>
        </View>
        {toast.action ? (
          <Pressable
            hitSlop={8}
            onPress={() => {
              toast.action?.onPress();
              hide();
            }}
          >
            <Text style={[styles.action, { color: cfg.color }]}>{toast.action.label}</Text>
          </Pressable>
        ) : null}
      </Pressable>
    </Animated.View>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: spacing.base,
    right: spacing.base,
    zIndex: 1000,
    elevation: 12,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.lg,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: 1,
  },
  message: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  action: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    paddingHorizontal: spacing.xs,
  },
});
