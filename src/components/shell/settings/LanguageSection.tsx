import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../../context/AppContext';
import { useToast } from '../../../context/ToastContext';
import { colors, radius, shadows, spacing, typography } from '../../../constants/theme';
import { FadeInView, stagger } from '../../common/Motion';
import { NoticeBanner } from '../Controls';
import { SectionScroll } from './common';

export const LANGUAGES = [
  { value: 'English', native: 'English', english: 'English', greeting: '', sample: 'Hello, how can we help you today?' },
  { value: 'Malayalam', native: 'മലയാളം', english: 'Malayalam', greeting: 'നമസ്കാരം', sample: 'നമസ്കാരം, എങ്ങനെ സഹായിക്കാം?' },
  { value: 'Hindi', native: 'हिन्दी', english: 'Hindi', greeting: 'नमस्ते', sample: 'नमस्ते, हम आपकी कैसे मदद कर सकते हैं?' },
  { value: 'Tamil', native: 'தமிழ்', english: 'Tamil', greeting: 'வணக்கம்', sample: 'வணக்கம், நாங்கள் எப்படி உதவலாம்?' },
];

/** Greeting in the chosen language (first translated string); null → use the English time-of-day greeting. */
export const localizedGreeting = (value: string): string | null => LANGUAGES.find((l) => l.value === value)?.greeting || null;

/** "മലയാളം (Malayalam)" for settings rows; plain "English" for English. */
export const languageLabel = (value: string) => {
  const lang = LANGUAGES.find((l) => l.value === value || l.native === value);
  if (!lang) return value;
  return lang.value === 'English' ? 'English' : `${lang.native} (${lang.english})`;
};

export const LanguageSection: React.FC = () => {
  const { settings, updateSettings } = useApp();
  const { showToast } = useToast();

  const choose = (value: string) => {
    if (value === settings.language) return;
    const lang = LANGUAGES.find((l) => l.value === value)!;
    Haptics.selectionAsync().catch(() => {});
    updateSettings({ language: value });
    showToast({
      type: 'success',
      title: `Language set to ${lang.native}`,
      message:
        value === 'English'
          ? 'All screens are shown in English.'
          : 'UI translations are rolling out — the dashboard greeting is translated first; other screens stay in English for now.',
    });
  };

  return (
    <SectionScroll>
      <NoticeBanner
        icon="language"
        message="Clinical records, prescriptions and receipts always stay in English for medico-legal consistency. Patient-facing messages use the patient's preferred language."
        style={styles.notice}
      />
      <View style={styles.card} accessibilityRole="radiogroup">
        {LANGUAGES.map((l, i) => {
          const selected = l.value === settings.language;
          return (
            <FadeInView key={l.value} delay={stagger(i, 50)}>
              <Pressable
                onPress={() => choose(l.value)}
                android_ripple={{ color: colors.cardMuted }}
                style={({ pressed }) => [styles.row, i > 0 && styles.divider, selected && styles.rowSelected, pressed && styles.rowPressed]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${l.english}${l.native !== l.english ? `, ${l.native}` : ''}`}
              >
                <View style={[styles.badge, selected && styles.badgeSelected]}>
                  <Text style={[styles.badgeText, selected && styles.badgeTextSelected]}>{l.native.charAt(0)}</Text>
                </View>
                <View style={styles.body}>
                  <Text style={styles.native}>{l.native}</Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {l.english !== l.native ? `${l.english} • ` : ''}
                    {l.sample}
                  </Text>
                </View>
                <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? colors.primary : colors.textMuted} />
              </Pressable>
            </FadeInView>
          );
        })}
      </View>
    </SectionScroll>
  );
};

const styles = StyleSheet.create({
  notice: {
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    ...shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md,
    minHeight: 64,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  rowSelected: {
    backgroundColor: '#F7FAFF',
  },
  rowPressed: {
    backgroundColor: colors.cardMuted,
  },
  badge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSelected: {
    backgroundColor: colors.primary,
  },
  badgeText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
  badgeTextSelected: {
    color: '#FFFFFF',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  native: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  meta: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
