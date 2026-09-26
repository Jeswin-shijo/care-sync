import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { BottomSheet } from '../common/BottomSheet';
import { Button } from '../common/Button';
import { Skeleton, useReducedMotion } from '../common/Motion';

interface VoiceDictationSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Receives the finished transcript; the sheet closes itself afterwards. */
  onTranscript: (text: string) => void;
  /** Produces the transcript when recording stops. */
  getTranscript: () => string;
  title?: string;
  subtitle?: string;
  /** Example of what to say, shown under the timer. */
  hint?: string;
}

const BARS = 11;
const MAX_SECONDS = 15;
const TRANSCRIBE_MS = 1300;

const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/**
 * Voice input (simulated in this build): a live recording ring + timer, then a
 * short "Transcribing…" pass that returns a realistic, context-aware transcript.
 */
export const VoiceDictationSheet: React.FC<VoiceDictationSheetProps> = ({
  visible,
  onClose,
  onTranscript,
  getTranscript,
  title = 'Voice input',
  subtitle = 'Speak naturally — MediOS types it for you',
  hint,
}) => {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<'recording' | 'transcribing'>('recording');
  const [seconds, setSeconds] = useState(0);
  const ring = useRef(new Animated.Value(0)).current;
  const bars = useRef(Array.from({ length: BARS }, () => new Animated.Value(0.3))).current;
  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const getTranscriptRef = useRef(getTranscript);
  getTranscriptRef.current = getTranscript;

  // Reset every time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setPhase('recording');
    setSeconds(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    return () => {
      if (finishTimer.current) clearTimeout(finishTimer.current);
      finishTimer.current = null;
    };
  }, [visible]);

  const recording = visible && phase === 'recording';

  // Timer (auto-stops at MAX_SECONDS).
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  useEffect(() => {
    if (recording && seconds >= MAX_SECONDS) stop();
  }, [seconds, recording]);

  // Recording ring + live level bars.
  useEffect(() => {
    if (!recording || reduced) {
      ring.setValue(0);
      bars.forEach((b, i) => b.setValue(0.35 + ((i * 37) % 50) / 100));
      return;
    }
    const ringLoop = Animated.loop(
      Animated.timing(ring, { toValue: 1, duration: 1500, easing: Easing.out(Easing.quad), useNativeDriver: true })
    );
    ringLoop.start();
    const id = setInterval(() => {
      Animated.parallel(
        bars.map((b) =>
          Animated.timing(b, { toValue: 0.2 + Math.random() * 0.8, duration: 150, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
        )
      ).start();
    }, 170);
    return () => {
      ringLoop.stop();
      clearInterval(id);
    };
  }, [recording, reduced]);

  const stop = () => {
    if (phase !== 'recording') return;
    Haptics.selectionAsync().catch(() => {});
    setPhase('transcribing');
    finishTimer.current = setTimeout(() => {
      finishTimer.current = null;
      onTranscript(getTranscriptRef.current());
      onClose();
    }, TRANSCRIBE_MS);
  };

  const cancel = () => {
    if (finishTimer.current) clearTimeout(finishTimer.current);
    finishTimer.current = null;
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={cancel}
      title={title}
      subtitle={subtitle}
      scroll={false}
      footer={
        <View style={styles.footer}>
          <Button title="Cancel" variant="ghost" onPress={cancel} style={styles.footerBtn} />
          <Button
            title={phase === 'recording' ? 'Stop & transcribe' : 'Transcribing…'}
            onPress={stop}
            loading={phase === 'transcribing'}
            icon={phase === 'recording' ? <Ionicons name="stop" size={16} color="#FFFFFF" /> : undefined}
            style={styles.footerBtnPrimary}
          />
        </View>
      }
    >
      {phase === 'recording' ? (
        <View style={styles.center} accessibilityLiveRegion="polite" accessibilityLabel={`Recording, ${seconds} seconds`}>
          <View style={styles.micWrap}>
            {[0, 0.5].map((offset) => (
              <Animated.View
                key={offset}
                style={[
                  styles.ring,
                  {
                    opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.45 - offset * 0.3, 0] }),
                    transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1 + offset * 0.2, 1.7 + offset * 0.2] }) }],
                  },
                ]}
              />
            ))}
            <View style={styles.mic}>
              <Ionicons name="mic" size={34} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.levels}>
            {bars.map((b, i) => (
              <Animated.View key={i} style={[styles.bar, { transform: [{ scaleY: b }] }]} />
            ))}
          </View>
          <Text style={styles.timer}>{clock(seconds)}</Text>
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.live}>Listening…</Text>
          </View>
          {!!hint && <Text style={styles.hint}>{hint}</Text>}
          <Text style={styles.note}>Simulated dictation in this build — no audio leaves the device.</Text>
        </View>
      ) : (
        <View style={styles.transcribing} accessibilityLiveRegion="polite" accessibilityLabel="Transcribing">
          <View style={styles.transHeader}>
            <Ionicons name="sparkles" size={16} color={colors.primary} />
            <Text style={styles.transTitle}>Transcribing {clock(seconds)} of audio…</Text>
          </View>
          <Skeleton height={14} width="92%" />
          <Skeleton height={14} width="78%" style={{ marginTop: 10 }} />
          <Skeleton height={14} width="54%" style={{ marginTop: 10 }} />
        </View>
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  micWrap: {
    width: 132,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.danger,
  },
  mic: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  levels: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 36,
    marginTop: spacing.sm,
  },
  bar: {
    width: 5,
    height: 32,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  timer: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  live: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  hint: {
    marginTop: spacing.md,
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: spacing.base,
  },
  note: {
    marginTop: spacing.md,
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
  transcribing: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  transHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  transTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  footerBtn: {
    flex: 1,
  },
  footerBtnPrimary: {
    flex: 2,
  },
});
