import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';

const { width } = Dimensions.get('window');

export type AlertType = 'success' | 'warning' | 'danger' | 'info' | 'default';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive' | 'primary';
}

export interface CustomAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  type?: AlertType;
  icon?: keyof typeof Ionicons.glyphMap;
  buttons?: AlertButton[];
  onClose?: () => void;
  dismissible?: boolean;
}

const TYPE_CONFIGS: Record<
  AlertType,
  {
    bgBadge: string;
    borderBadge: string;
    iconColor: string;
    defaultIcon: keyof typeof Ionicons.glyphMap;
    primaryBtnBg: string;
    primaryBtnText: string;
  }
> = {
  success: {
    bgBadge: '#ECFDF5',
    borderBadge: '#A7F3D0',
    iconColor: '#10B981',
    defaultIcon: 'checkmark-circle',
    primaryBtnBg: '#10B981',
    primaryBtnText: '#FFFFFF',
  },
  warning: {
    bgBadge: '#FFFBEB',
    borderBadge: '#FDE68A',
    iconColor: '#F59E0B',
    defaultIcon: 'warning',
    primaryBtnBg: '#F59E0B',
    primaryBtnText: '#FFFFFF',
  },
  danger: {
    bgBadge: '#FEF2F2',
    borderBadge: '#FECACA',
    iconColor: '#EF4444',
    defaultIcon: 'alert-circle',
    primaryBtnBg: '#EF4444',
    primaryBtnText: '#FFFFFF',
  },
  info: {
    bgBadge: '#EFF6FF',
    borderBadge: '#BFDBFE',
    iconColor: '#1E6BFF',
    defaultIcon: 'information-circle',
    primaryBtnBg: '#1E6BFF',
    primaryBtnText: '#FFFFFF',
  },
  default: {
    bgBadge: '#F1F5F9',
    borderBadge: '#CBD5E1',
    iconColor: '#0F172A',
    defaultIcon: 'notifications',
    primaryBtnBg: '#1E6BFF',
    primaryBtnText: '#FFFFFF',
  },
};

/**
 * Intelligent helper to deduce the best visual theme and icon from alert content
 */
export function deduceAlertType(
  title: string,
  message?: string
): { type: AlertType; icon: keyof typeof Ionicons.glyphMap } {
  // The title decides errors/warnings; the message only refines success icons.
  // (A success message that happens to say "required" must not look like an error.)
  const t = title.toLowerCase();
  const combined = `${title} ${message || ''}`.toLowerCase();

  if (/error|invalid|failed|unable|not allowed|denied|restricted|critical/.test(t)) {
    return { type: 'danger', icon: 'close-circle-outline' };
  }
  if (/empty/.test(t) && combined.includes('cart')) {
    return { type: 'warning', icon: 'cart-outline' };
  }
  if (/warning|select|missing|required|attention|confirm|override|discard|leave|delete|remove|cancel|unsaved|already|no bed|not admitted|out of stock|expired/.test(t)) {
    return { type: 'warning', icon: 'alert-circle-outline' };
  }
  if (/generated|registered|booked|admitted|discharged|success|saved|sent|dispensed|approved|collected|paid|scheduled|recorded|issued|dispatched|done|complete/.test(t)) {
    if (/bill|receipt|invoice|payment|paid|collected/.test(combined)) {
      return { type: 'success', icon: 'receipt-outline' };
    }
    if (/registered|patient/.test(t)) {
      return { type: 'success', icon: 'person-add-outline' };
    }
    if (/appointment|booked|scheduled/.test(combined)) {
      return { type: 'success', icon: 'calendar-outline' };
    }
    return { type: 'success', icon: 'checkmark-circle-outline' };
  }
  return { type: 'info', icon: 'information-circle-outline' };
}

export const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  type,
  icon,
  buttons,
  onClose,
  dismissible = true,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Auto-deduce type and icon if not explicitly provided
  const deduced = deduceAlertType(title, message);
  const activeType = type || deduced.type;
  const activeIcon = icon || (type ? TYPE_CONFIGS[activeType].defaultIcon : deduced.icon);
  const theme = TYPE_CONFIGS[activeType];

  useEffect(() => {
    if (visible) {
      // Trigger haptic feedback based on type
      if (activeType === 'danger') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      } else if (activeType === 'warning') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      } else if (activeType === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.85,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, activeType]);

  const effectiveButtons: AlertButton[] =
    buttons && buttons.length > 0
      ? buttons
      : [{ text: 'OK', style: 'primary', onPress: onClose }];

  const handleButtonPress = (btn: AlertButton) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // Close first: if the handler opens another Alert, that one must win.
    if (onClose) {
      onClose();
    }
    if (btn.onPress) {
      btn.onPress();
    }
  };

  // Side-by-side only when both labels are short; long labels stack so they never wrap.
  const isDualButton = effectiveButtons.length === 2 && effectiveButtons.every((b) => b.text.length <= 14);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={() => {
        if (dismissible && onClose) onClose();
      }}
    >
      <TouchableWithoutFeedback
        onPress={() => {
          if (dismissible && onClose) onClose();
        }}
      >
        <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalCard,
                {
                  transform: [{ scale: scaleAnim }],
                  opacity: opacityAnim,
                },
              ]}
            >
              {/* Outer Badge Ring */}
              <View style={[styles.iconOuterRing, { borderColor: theme.borderBadge }]}>
                <View style={[styles.iconBadge, { backgroundColor: theme.bgBadge }]}>
                  <Ionicons name={activeIcon} size={34} color={theme.iconColor} />
                </View>
              </View>

              {/* Title & Description */}
              <Text style={styles.title}>{title}</Text>
              {message ? (
                <Text style={[styles.message, /\n\s*[•\-\d]/.test(message) && styles.messageList]}>{message}</Text>
              ) : null}

              {/* Action Buttons */}
              <View
                style={[
                  styles.buttonContainer,
                  isDualButton && styles.buttonContainerDual,
                ]}
              >
                {effectiveButtons.map((btn, index) => {
                  const isCancel = btn.style === 'cancel';
                  const isDestructive = btn.style === 'destructive';
                  const isPrimary = !isCancel && !isDestructive;

                  return (
                    <TouchableOpacity
                      key={index}
                      activeOpacity={0.85}
                      style={[
                        styles.btnBase,
                        isDualButton && styles.btnDual,
                        isCancel && styles.btnCancel,
                        isDestructive && styles.btnDestructive,
                        isPrimary && { backgroundColor: theme.primaryBtnBg },
                      ]}
                      onPress={() => handleButtonPress(btn)}
                    >
                      <Text
                        style={[
                          styles.btnText,
                          isCancel && styles.btnTextCancel,
                          isDestructive && styles.btnTextDestructive,
                          isPrimary && { color: theme.primaryBtnText },
                        ]}
                      >
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    width: Math.min(width - 48, 380),
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(241, 245, 249, 0.9)',
    ...shadows.lg,
  },
  iconOuterRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconBadge: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.fontSizes.lg + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  message: {
    fontSize: typography.fontSizes.sm + 1,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  messageList: {
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
    marginTop: 4,
  },
  buttonContainerDual: {
    flexDirection: 'row',
  },
  btnBase: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    ...shadows.sm,
  },
  btnDual: {
    flex: 1,
  },
  btnCancel: {
    backgroundColor: '#F1F5F9',
    shadowOpacity: 0,
    elevation: 0,
  },
  btnDestructive: {
    backgroundColor: '#EF4444',
  },
  btnText: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    textAlign: 'center',
  },
  btnTextCancel: {
    color: '#475569',
  },
  btnTextDestructive: {
    color: '#FFFFFF',
  },
});
