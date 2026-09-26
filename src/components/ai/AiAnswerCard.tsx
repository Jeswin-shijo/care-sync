import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AiActionCard } from '../../logic/hospital';
import type { AiAnswer } from '../../logic/aiEngine';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { FadeInView, TypingDots } from '../common/Motion';
import { AssistantBadge } from './RobotAvatar';
import { CitationChips } from './CitationChips';
import { ActionCard } from './ActionCard';
import { shareMessage } from './ChatBubble';
import { useTypewriter } from './useTypewriter';

interface AiAnswerCardProps {
  title: string;
  /** Undefined while the answer is being prepared. */
  answer?: AiAnswer;
  /** Stream the text in (first reveal only). */
  stream?: boolean;
  onStreamDone?: () => void;
  onActionPress?: (card: AiActionCard) => void;
  onClose?: () => void;
  meta?: string;
  style?: StyleProp<ViewStyle>;
}

/** An inline MediOS AI answer (text + sources + action) inside a copilot panel. */
export const AiAnswerCard: React.FC<AiAnswerCardProps> = ({ title, answer, stream = false, onStreamDone, onActionPress, onClose, meta, style }) => {
  const { shown, done, skip, streaming } = useTypewriter(answer?.text ?? '', !!answer && stream, 20, onStreamDone);

  return (
    <FadeInView offset={8} style={[styles.card, style]}>
      <View style={styles.head}>
        <AssistantBadge size={24} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {!!meta && <Text style={styles.meta}>{meta}</Text>}
        </View>
        {onClose && (
          <Pressable onPress={onClose} hitSlop={10} style={styles.close} accessibilityRole="button" accessibilityLabel="Close answer">
            <Ionicons name="close" size={16} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>
      {!answer ? (
        <View style={styles.thinking} accessibilityLabel="MediOS AI is preparing an answer">
          <TypingDots color={colors.primary} />
          <Text style={styles.thinkingText}>Reading the record…</Text>
        </View>
      ) : (
        <>
          <Pressable
            onPress={streaming ? skip : undefined}
            onLongPress={() => shareMessage(answer)}
            delayLongPress={350}
            accessibilityHint={streaming ? 'Tap to show the full answer' : 'Long press to share or copy'}
          >
            <Text style={styles.text}>{shown}</Text>
          </Pressable>
          {done && (
            <FadeInView offset={6} duration={240} style={styles.extras}>
              <CitationChips citations={answer.citations} />
              {answer.actionCard && onActionPress && <ActionCard card={answer.actionCard} onPress={onActionPress} />}
            </FadeInView>
          )}
        </>
      )}
    </FadeInView>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F8FBFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#D6E6FF',
    padding: spacing.md,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.primaryDark,
  },
  meta: {
    fontSize: typography.fontSizes.xs - 1,
    color: colors.textMuted,
    marginTop: 1,
  },
  close: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thinking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  thinkingText: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
  },
  text: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 20,
    color: colors.text,
  },
  extras: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
});
