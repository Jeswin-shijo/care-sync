import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, TextInput, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../constants/theme';

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onMicPress?: () => void;
  /** AI is answering — sending is paused so a question can't be sent twice. */
  busy?: boolean;
  placeholder?: string;
  inputRef?: React.Ref<TextInput>;
  maxLength?: number;
  onFocus?: () => void;
  onBlur?: () => void;
  style?: StyleProp<ViewStyle>;
}

const LINE_HEIGHT = 20;
const MAX_LINES = 4;

/**
 * Multiline composer that grows to ~4 lines. Return sends without dropping
 * the keyboard (submitBehavior "submit"), so follow-up questions are quick.
 */
export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChangeText,
  onSend,
  onMicPress,
  busy = false,
  placeholder = 'Ask anything…',
  inputRef,
  maxLength = 500,
  onFocus,
  onBlur,
  style,
}) => {
  const canSend = value.trim().length > 0 && !busy;

  return (
    <View style={[styles.bar, style]}>
      <View style={styles.field}>
        <Ionicons name="sparkles" size={16} color={colors.primary} style={styles.leading} />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          multiline
          maxLength={maxLength}
          submitBehavior="submit"
          returnKeyType="send"
          enablesReturnKeyAutomatically
          onSubmitEditing={() => {
            if (canSend) onSend();
          }}
          onFocus={onFocus}
          onBlur={onBlur}
          accessibilityLabel={placeholder}
        />
        {onMicPress && (
          <Pressable
            onPress={onMicPress}
            disabled={busy}
            hitSlop={8}
            style={({ pressed }) => [styles.mic, pressed && { backgroundColor: colors.primaryLight }, busy && { opacity: 0.4 }]}
            accessibilityRole="button"
            accessibilityLabel="Voice input"
          >
            <Ionicons name="mic-outline" size={20} color={colors.primary} />
          </Pressable>
        )}
      </View>
      <Pressable
        onPress={onSend}
        disabled={!canSend}
        style={({ pressed }) => [styles.send, canSend ? styles.sendOn : styles.sendOff, pressed && canSend && { transform: [{ scale: 0.94 }] }]}
        accessibilityRole="button"
        accessibilityLabel="Send message"
        accessibilityState={{ disabled: !canSend, busy }}
      >
        {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="arrow-up" size={20} color="#FFFFFF" />}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: '#FFFFFF',
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.cardMuted,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: spacing.md,
    paddingRight: 4,
    minHeight: 44,
  },
  leading: {
    marginBottom: 13,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSizes.sm + 1,
    lineHeight: LINE_HEIGHT,
    color: colors.text,
    paddingTop: 11,
    paddingBottom: 11,
    minHeight: 42,
    maxHeight: LINE_HEIGHT * MAX_LINES + 22,
    textAlignVertical: 'center',
  },
  mic: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOn: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  sendOff: {
    backgroundColor: '#CBD5E1',
  },
});
