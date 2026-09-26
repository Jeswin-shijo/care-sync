import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { colors, shadows } from '../../../constants/theme';
import { ChatInput } from '../ChatInput';

export interface AskBarHandle {
  /** Fill the field (e.g. from voice dictation) and focus it. */
  fill: (text: string) => void;
}

interface AskBarProps {
  placeholder: string;
  busy: boolean;
  onAsk: (text: string) => void;
  onMic: () => void;
  onFocusChange: (focused: boolean) => void;
  bottomPadding: number;
  /** Visually hidden but kept mounted, so a half-typed question survives. */
  hidden?: boolean;
}

/**
 * "Ask anything about this patient" — owns its own text so typing doesn't
 * re-render the whole copilot screen on every keystroke.
 */
export const AskBar = React.memo(
  forwardRef<AskBarHandle, AskBarProps>(function AskBar({ placeholder, busy, onAsk, onMic, onFocusChange, bottomPadding, hidden = false }, ref) {
    const [text, setText] = useState('');
    const inputRef = useRef<TextInput>(null);

    useImperativeHandle(ref, () => ({
      fill: (value: string) => {
        setText(value);
        setTimeout(() => inputRef.current?.focus(), 350);
      },
    }));

    return (
      <View style={[styles.bar, { paddingBottom: bottomPadding }, hidden && styles.hidden]}>
        <ChatInput
          inputRef={inputRef}
          value={text}
          onChangeText={setText}
          onSend={() => {
            const q = text.trim();
            if (!q || busy) return;
            onAsk(q);
            setText('');
          }}
          onMicPress={onMic}
          busy={busy}
          placeholder={placeholder}
          onFocus={() => onFocusChange(true)}
          onBlur={() => onFocusChange(false)}
        />
      </View>
    );
  })
);

const styles = StyleSheet.create({
  hidden: {
    display: 'none',
  },
  bar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    ...shadows.md,
  },
});
