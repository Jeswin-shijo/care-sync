import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  LayoutChangeEvent,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { AiActionCard, AiChatMessage } from '../../logic/hospital';
import { colors, spacing, typography } from '../../constants/theme';
import { formScrollProps, KeyboardAwareContainer, useKeyboardHeight } from '../common/KeyboardAware';
import { FadeInView } from '../common/Motion';
import { ChatBubble, TypingBubble } from './ChatBubble';
import { ChatInput } from './ChatInput';
import { NewMessagePill } from './NewMessagePill';
import { Suggestion, SuggestionChips } from './SuggestionList';
import { VoiceDictationSheet } from './VoiceDictationSheet';
import { markStreamed, shouldStream } from './useTypewriter';

export interface VoiceConfig {
  transcripts: string[];
  title?: string;
  subtitle?: string;
  hint?: string;
}

interface ChatConversationProps {
  messages: AiChatMessage[];
  /** The assistant is preparing an answer. */
  typing: boolean;
  onSend: (text: string) => void;
  onActionPress: (card: AiActionCard) => void;
  /** Greeting + prompt list shown while the conversation is empty. */
  renderEmpty: (send: (text: string) => void, busy: boolean) => React.ReactNode;
  /** Compact prompt chips above the input once the chat has started. */
  suggestions: Suggestion[];
  placeholder: string;
  typingLabel?: string;
  voice: VoiceConfig;
  /** One-line guardrail / disclaimer under the input. */
  footerNote?: string;
  /** Bottom safe-area padding for stack screens (tab screens sit above the tab bar). */
  bottomInset?: number;
}

const NEAR_BOTTOM_PX = 120;

interface ComposerProps {
  showChips: boolean;
  suggestions: Suggestion[];
  typing: boolean;
  onChip: (text: string) => void;
  onSubmit: (text: string) => void;
  placeholder: string;
  voice: VoiceConfig;
  footerNote?: string;
  bottomInset: number;
}

/** Input + chips + voice. Owns the draft so keystrokes don't re-render the message list. */
const Composer = React.memo(function Composer({ showChips, suggestions, typing, onChip, onSubmit, placeholder, voice, footerNote, bottomInset }: ComposerProps) {
  const [draft, setDraft] = useState('');
  const [voiceOpen, setVoiceOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const lastTranscript = useRef<string | null>(null);
  const keyboardOpen = useKeyboardHeight() > 0;

  const send = () => {
    const text = draft.trim();
    if (!text || typing) return;
    onSubmit(text);
    setDraft('');
  };

  const pickTranscript = () => {
    const pool = voice.transcripts.filter((t) => t !== lastTranscript.current);
    const from = pool.length ? pool : voice.transcripts;
    const choice = from[Math.floor(Math.random() * from.length)] ?? '';
    lastTranscript.current = choice;
    return choice;
  };

  return (
    <>
      <View style={[styles.composer, { paddingBottom: keyboardOpen ? 0 : bottomInset }]}>
        {showChips && (
          <FadeInView offset={6} duration={260}>
            <SuggestionChips items={suggestions} onPress={onChip} disabled={typing} />
          </FadeInView>
        )}
        <ChatInput
          inputRef={inputRef}
          value={draft}
          onChangeText={setDraft}
          onSend={send}
          onMicPress={() => {
            Keyboard.dismiss();
            setVoiceOpen(true);
          }}
          busy={typing}
          placeholder={placeholder}
        />
        {!!footerNote && !keyboardOpen && (
          <Text style={styles.footerNote} numberOfLines={2}>
            {footerNote}
          </Text>
        )}
      </View>
      <VoiceDictationSheet
        visible={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        getTranscript={pickTranscript}
        onTranscript={(text) => {
          setDraft(text);
          setTimeout(() => inputRef.current?.focus(), 350);
        }}
        title={voice.title}
        subtitle={voice.subtitle}
        hint={voice.hint}
      />
    </>
  );
});

/**
 * The chat body shared by the staff AI Assistant and the Patient Assistant:
 * streaming answers, smart auto-scroll with a "New message" pill, prompt
 * chips that never wipe the draft, and a keyboard-aware composer.
 */
export const ChatConversation: React.FC<ChatConversationProps> = ({
  messages,
  typing,
  onSend,
  onActionPress,
  renderEmpty,
  suggestions,
  placeholder,
  typingLabel,
  voice,
  footerNote,
  bottomInset = 0,
}) => {
  const [showPill, setShowPill] = useState(false);
  const listRef = useRef<FlatList<AiChatMessage>>(null);
  const nearBottom = useRef(true);
  const forceScroll = useRef(false);
  const lastCount = useRef(messages.length);

  const scrollToEnd = useCallback((animated = true) => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated }));
  }, []);

  // New message bookkeeping: follow the user's own messages, otherwise only
  // auto-follow when they're already reading the bottom of the thread.
  useEffect(() => {
    if (!messages.length) {
      nearBottom.current = true;
      setShowPill(false);
    } else if (messages.length > lastCount.current) {
      const newest = messages[messages.length - 1];
      if (newest.sender === 'user') {
        forceScroll.current = true;
        setShowPill(false);
      } else if (!nearBottom.current) {
        setShowPill(true);
      }
    }
    lastCount.current = messages.length;
  }, [messages]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    const distance = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    nearBottom.current = distance < NEAR_BOTTOM_PX;
    if (nearBottom.current) setShowPill(false);
  }, []);

  const hasMessages = messages.length > 0;
  const onContentSizeChange = useCallback(() => {
    // Never auto-scroll the greeting away: only follow once a conversation exists.
    if (forceScroll.current || (nearBottom.current && hasMessages)) {
      forceScroll.current = false;
      if (hasMessages) scrollToEnd(true);
    }
  }, [scrollToEnd, hasMessages]);

  const onListLayout = useCallback(
    (_e: LayoutChangeEvent) => {
      // Keyboard opened/closed: keep the latest message in view if we were at the bottom.
      if (nearBottom.current && hasMessages) scrollToEnd(false);
    },
    [hasMessages, scrollToEnd]
  );

  /** Prompt chips & follow-ups: send immediately, never touching the typed draft. */
  const sendChip = useCallback(
    (text: string) => {
      if (typing) return;
      forceScroll.current = true;
      onSend(text);
    },
    [onSend, typing]
  );

  const submitDraft = useCallback(
    (text: string) => {
      forceScroll.current = true;
      onSend(text);
    },
    [onSend]
  );

  const lastIndex = messages.length - 1;
  const newestAssistantId = lastIndex >= 0 && messages[lastIndex].sender === 'assistant' ? messages[lastIndex].id : null;

  const renderItem: ListRenderItem<AiChatMessage> = useCallback(
    ({ item, index }) => (
      <ChatBubble
        message={item}
        stream={item.id === newestAssistantId && shouldStream(item.id, item.createdAt)}
        onStreamDone={markStreamed}
        onActionPress={onActionPress}
        onFollowUp={sendChip}
        showFollowUps={index === lastIndex}
        busy={typing}
      />
    ),
    [newestAssistantId, onActionPress, sendChip, lastIndex, typing]
  );

  const empty = !hasMessages;

  return (
    <KeyboardAwareContainer>
      <View style={styles.flex}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          extraData={`${typing}-${newestAssistantId}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={32}
          onContentSizeChange={onContentSizeChange}
          onLayout={onListLayout}
          ListHeaderComponent={
            empty ? (
              <View>{renderEmpty(sendChip, typing)}</View>
            ) : (
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Today</Text>
                <View style={styles.dividerLine} />
              </View>
            )
          }
          ListFooterComponent={typing ? <TypingBubble label={typingLabel} /> : null}
          {...formScrollProps}
        />
        <NewMessagePill
          visible={showPill}
          onPress={() => {
            setShowPill(false);
            nearBottom.current = true;
            scrollToEnd(true);
          }}
        />
      </View>

      <Composer
        showChips={!empty}
        suggestions={suggestions}
        typing={typing}
        onChip={sendChip}
        onSubmit={submitDraft}
        placeholder={placeholder}
        voice={voice}
        footerNote={footerNote}
        bottomInset={bottomInset}
      />
    </KeyboardAwareContainer>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.base,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: typography.fontSizes.xs - 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  composer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerNote: {
    fontSize: typography.fontSizes.xs - 1,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    marginTop: -2,
  },
});
