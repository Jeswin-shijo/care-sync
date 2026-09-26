import React, { useCallback, useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '../../context/AppContext';
import type { UserRole } from '../../context/AppContext';
import type { AiActionCard } from '../../logic/hospital';
import { ROLE_LABEL } from '../../logic/access';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { FadeInView, PulseDot } from '../../components/common/Motion';
import { openRoute } from '../../utils/navigation';
import { ChatConversation } from '../../components/ai/ChatConversation';
import { RobotAvatar } from '../../components/ai/RobotAvatar';
import { Suggestion, SuggestionList } from '../../components/ai/SuggestionList';

const GREETING_NAME: Record<UserRole, string> = {
  doctor: 'Dr. Priya',
  admin: 'Rajiv',
  nurse: 'Anjali',
  lab: 'Vishnu',
  pharmacy: 'Neethu',
  patient: 'there',
};

const SUGGESTIONS: Suggestion[] = [
  { text: 'Find all patients with pending bills above ₹10,000', icon: 'wallet-outline', color: colors.warning },
  { text: "Generate today's OPD collection report", icon: 'bar-chart-outline', color: colors.success },
  { text: 'Show bed availability in ICU', icon: 'bed-outline', color: colors.purple },
  { text: 'Create a discharge summary for Ananya S', icon: 'document-text-outline', color: colors.primary },
  { text: "Find the receipt for Rahul's payment yesterday", icon: 'receipt-outline', color: '#0EA5E9' },
  { text: 'Show all diabetic patients with abnormal HbA1c', icon: 'flask-outline', color: colors.danger },
  { text: "Check Rahul's drug interactions", icon: 'medkit-outline', color: colors.orange },
];

/** Puts the prompts a role reaches for first at the top; the rest keep the design order. */
const ROLE_FIRST: Partial<Record<UserRole, string>> = {
  nurse: 'Show bed availability in ICU',
  lab: 'Show all diabetic patients with abnormal HbA1c',
  pharmacy: "Check Rahul's drug interactions",
};

const VOICE_TRANSCRIPTS: Record<UserRole, string[]> = {
  doctor: ["Show today's appointments for Dr. Priya", 'Any critical lab results today?', "Check Rahul's drug interactions", 'Show all diabetic patients with abnormal HbA1c'],
  admin: ["Generate today's OPD collection report", 'Find all patients with pending bills above 10,000', 'Show bed availability in ICU'],
  nurse: ['Which patients are admitted?', 'Show bed availability in ICU', "Show today's appointments"],
  lab: ['Any critical lab results today?', 'Show all diabetic patients with abnormal HbA1c'],
  pharmacy: ["Check Rahul's drug interactions", 'Any prescriptions flagged for safety?'],
  patient: [],
};

const GUARDRAIL = 'MediOS AI answers only from hospital records • cites sources • a clinician approves anything it drafts';

export default function AiAssistantRoute() {
  const { activeRole, aiChatMessages, aiTyping, sendAiMessage, clearAiChat, setActiveRole, hospitalProfile } = useApp();

  const suggestions = useMemo(() => {
    const first = ROLE_FIRST[activeRole];
    return first ? [...SUGGESTIONS.filter((s) => s.text === first), ...SUGGESTIONS.filter((s) => s.text !== first)] : SUGGESTIONS;
  }, [activeRole]);

  const voice = useMemo(
    () => ({
      transcripts: VOICE_TRANSCRIPTS[activeRole],
      subtitle: 'Ask your question out loud',
      hint: `Try: “${VOICE_TRANSCRIPTS[activeRole][0] ?? "Show today's appointments"}”`,
    }),
    [activeRole]
  );

  const onActionPress = useCallback((card: AiActionCard) => {
    if (card.route) openRoute(card.route, card.params);
  }, []);

  const confirmNewChat = () => {
    if (aiTyping) return;
    Alert.alert('Start a new chat?', 'This clears the current conversation with MediOS AI.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'New chat', style: 'destructive', onPress: clearAiChat },
    ]);
  };

  const hasChat = aiChatMessages.length > 0;

  const header = (
    <Header
      title="AI Assistant"
      subtitle="MediOS AI • live hospital records"
      showBack={false}
      rightAction={
        hasChat && activeRole !== 'patient' ? (
          <Pressable
            onPress={confirmNewChat}
            disabled={aiTyping}
            hitSlop={8}
            style={({ pressed }) => [styles.newChat, pressed && { backgroundColor: '#DCE8FF' }, aiTyping && { opacity: 0.5 }]}
            accessibilityRole="button"
            accessibilityLabel="Start a new chat"
          >
            <Ionicons name="create-outline" size={16} color={colors.primary} />
            <Text style={styles.newChatText}>New chat</Text>
          </Pressable>
        ) : undefined
      }
    />
  );

  // RBAC: the staff assistant reads hospital-wide records, which the patient role can't see.
  if (activeRole === 'patient') {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        {header}
        <View style={styles.restricted}>
          <EmptyState
            icon="lock-closed-outline"
            title="Staff assistant is restricted"
            description="You're signed in to the Patient App. Hospital-wide records are only available to staff roles — the Patient Assistant can help with your appointments, reports and medicines."
            actionTitle="Open Patient Assistant"
            onActionPress={() => router.push('/patient-assistant')}
          />
          <Button
            title="Switch to Doctor role"
            variant="outline"
            onPress={() => setActiveRole('doctor')}
            icon={<Ionicons name="swap-horizontal" size={16} color={colors.primary} />}
          />
        </View>
      </SafeAreaView>
    );
  }

  const renderEmpty = (send: (text: string) => void, busy: boolean) => (
    <View>
      <FadeInView style={styles.hero}>
        <RobotAvatar size={88} />
        <Text style={styles.hello}>Hello {GREETING_NAME[activeRole]} 👋</Text>
        <Text style={styles.helloSub}>How can I help you today?</Text>
        <View style={styles.rolePill}>
          <PulseDot size={6} color={colors.success} />
          <Text style={styles.rolePillText} numberOfLines={1}>
            {ROLE_LABEL[activeRole]} • {hospitalProfile.name}
          </Text>
        </View>
      </FadeInView>
      <Text style={styles.sectionLabel}>Suggested for you</Text>
      <SuggestionList items={suggestions} onPress={send} disabled={busy} />
      <FadeInView delay={380} style={styles.capabilities}>
        <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.capabilitiesText}>
          Ask about bills and receipts, collections, beds, appointments, lab results, drug safety, protocols or any patient by name.
          Long-press an answer to share or copy it.
        </Text>
      </FadeInView>
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      {header}
      <ChatConversation
        messages={aiChatMessages}
        typing={aiTyping}
        onSend={sendAiMessage}
        onActionPress={onActionPress}
        renderEmpty={renderEmpty}
        suggestions={suggestions}
        placeholder="Ask anything about your hospital…"
        typingLabel="Checking hospital records…"
        voice={voice}
        footerNote={GUARDRAIL}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  newChat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  newChatText: {
    fontSize: typography.fontSizes.sm - 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  restricted: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.base,
    gap: spacing.sm,
  },
  hero: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.base,
  },
  hello: {
    fontSize: typography.fontSizes.xl + 2,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  helloSub: {
    fontSize: typography.fontSizes.md,
    color: colors.textSecondary,
    marginTop: 4,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  rolePillText: {
    flexShrink: 1,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
  },
  sectionLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  capabilities: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.base,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.cardMuted,
  },
  capabilitiesText: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    lineHeight: 17,
  },
});
