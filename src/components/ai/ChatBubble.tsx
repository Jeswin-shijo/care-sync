import React from 'react';
import { Pressable, Share, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { AiActionCard, AiChatMessage } from '../../logic/hospital';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';
import { FadeInView, TypingDots } from '../common/Motion';
import { AssistantBadge } from './RobotAvatar';
import { CitationChips } from './CitationChips';
import { ActionCard } from './ActionCard';
import { FollowUpChips } from './FollowUpChips';
import { useTypewriter } from './useTypewriter';

/** Long-press → system share sheet (Clipboard isn't installed; Share includes "Copy"). */
export const shareMessage = async (message: Pick<AiChatMessage, 'text' | 'citations'>) => {
  Haptics.selectionAsync().catch(() => {});
  const sources = message.citations?.length ? `\n\nSources: ${message.citations.map((c) => c.label).join('; ')}` : '';
  try {
    await Share.share({ message: `${message.text}${sources}` });
  } catch {
    // Share sheet dismissed or unavailable — nothing to do.
  }
};

interface ChatBubbleProps {
  message: AiChatMessage;
  /** Typewriter-reveal the text (newest assistant answer only). */
  stream?: boolean;
  onStreamDone?: (id: string) => void;
  onActionPress?: (card: AiActionCard) => void;
  onFollowUp?: (text: string) => void;
  /** Follow-up chips only make sense under the latest answer. */
  showFollowUps?: boolean;
  /** Disables follow-ups/action while the AI is still answering. */
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const ChatBubble = React.memo(
  function ChatBubble({ message, stream = false, onStreamDone, onActionPress, onFollowUp, showFollowUps = false, busy = false, style }: ChatBubbleProps) {
    const isUser = message.sender === 'user';
    const { shown, done, skip, streaming } = useTypewriter(message.text, !isUser && stream, 20, () => onStreamDone?.(message.id));

    if (isUser) {
      return (
        <View style={[styles.row, styles.rowUser, style]}>
          <View style={styles.userCol}>
            <Pressable
              onLongPress={() => shareMessage(message)}
              delayLongPress={350}
              style={({ pressed }) => [styles.bubble, styles.userBubble, pressed && { opacity: 0.9 }]}
              accessibilityRole="text"
              accessibilityLabel={`You said: ${message.text}`}
              accessibilityHint="Long press to share or copy"
            >
              <Text style={[styles.text, styles.userText]} selectable={false}>
                {message.text}
              </Text>
            </Pressable>
            <Text style={[styles.time, { textAlign: 'right' }]}>{message.timestamp}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.row, style]}>
        <AssistantBadge size={28} style={styles.avatar} />
        <View style={styles.botCol}>
          <Pressable
            onPress={streaming ? skip : undefined}
            onLongPress={() => shareMessage(message)}
            delayLongPress={350}
            style={({ pressed }) => [styles.bubble, styles.botBubble, pressed && !streaming && { backgroundColor: '#FAFCFF' }]}
            accessibilityRole={streaming ? 'button' : 'text'}
            accessibilityLabel={`MediOS AI: ${message.text}`}
            accessibilityHint={streaming ? 'Tap to show the full answer. Long press to share or copy.' : 'Long press to share or copy'}
          >
            <Text style={[styles.text, styles.botText]}>{shown}</Text>
          </Pressable>
          {done && (
            <FadeInView offset={6} duration={260} style={styles.extras}>
              {!!message.citations?.length && <CitationChips citations={message.citations} />}
              {message.actionCard && onActionPress && (
                <ActionCard card={message.actionCard} onPress={onActionPress} />
              )}
              {showFollowUps && !!message.followUps?.length && onFollowUp && (
                <FollowUpChips items={message.followUps} onPress={onFollowUp} disabled={busy} />
              )}
            </FadeInView>
          )}
          <Text style={styles.time}>
            MediOS AI • {message.timestamp}
            {streaming ? '  ·  tap to skip' : ''}
          </Text>
        </View>
      </View>
    );
  }
);

/** Assistant "thinking" bubble shown while an answer is being prepared. */
export const TypingBubble: React.FC<{ label?: string; style?: StyleProp<ViewStyle> }> = ({
  label = 'Checking hospital records…',
  style,
}) => (
  <FadeInView offset={8} duration={240} style={[styles.row, style]}>
    <AssistantBadge size={28} style={styles.avatar} />
    <View style={[styles.bubble, styles.botBubble, styles.typing]} accessibilityLabel="MediOS AI is typing" accessibilityLiveRegion="polite">
      <TypingDots color={colors.primary} />
      <Text style={styles.typingText}>{label}</Text>
    </View>
  </FadeInView>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  avatar: {
    marginTop: 2,
  },
  userCol: {
    maxWidth: '82%',
    alignItems: 'flex-end',
  },
  botCol: {
    flex: 1,
    maxWidth: '88%',
  },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderTopLeftRadius: 4,
    alignSelf: 'flex-start',
    ...shadows.sm,
  },
  text: {
    fontSize: typography.fontSizes.sm + 1,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
  },
  botText: {
    color: colors.text,
  },
  extras: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  time: {
    fontSize: typography.fontSizes.xs - 1,
    color: colors.textMuted,
    marginTop: 4,
  },
  typing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
  },
  typingText: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
  },
});
