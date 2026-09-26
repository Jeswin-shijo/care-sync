import React, { useCallback, useEffect } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import type { AiActionCard } from '../logic/hospital';
import { colors, radius, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { EmptyState } from '../components/common/EmptyState';
import { FadeInView } from '../components/common/Motion';
import { openRoute } from '../utils/navigation';
import { ChatConversation } from '../components/ai/ChatConversation';
import { RobotAvatar } from '../components/ai/RobotAvatar';
import { Suggestion, SuggestionList } from '../components/ai/SuggestionList';
import { FollowUpChips } from '../components/ai/FollowUpChips';

/** The four Patient App shortcuts from the design; each asks the assistant, which answers with an action card. */
const QUICK_ACTIONS: Suggestion[] = [
  { text: 'Book Appointment', query: 'Book an appointment', icon: 'calendar-outline', color: colors.primary },
  { text: 'My Reports', query: 'Explain my latest report', icon: 'document-text-outline', color: colors.purple },
  { text: 'Medicine Reminder', query: 'My medicines today', icon: 'alarm-outline', color: colors.orange },
  { text: 'Hospital Navigation', query: 'Where is the laboratory?', icon: 'navigate-outline', color: colors.teal },
];

const MORE_QUESTIONS = ['When is my next appointment?', 'Show my bills', 'I have fever and body ache'];

const CHIPS: Suggestion[] = [
  ...QUICK_ACTIONS,
  { text: 'Next appointment', query: 'When is my next appointment?', icon: 'time-outline' },
  { text: 'My bills', query: 'Show my bills', icon: 'receipt-outline' },
  { text: 'Where is the pharmacy?', icon: 'medical-outline' },
];

const VOICE_TRANSCRIPTS = [
  'When is my next appointment?',
  'Where is the pharmacy?',
  'Explain my latest report',
  'I have had fever and body ache since yesterday',
];

const VOICE = { transcripts: VOICE_TRANSCRIPTS, subtitle: 'Ask your question out loud', hint: 'Try: “When is my next appointment?”' };

const DISCLAIMER = 'Guidance only, not a diagnosis • In an emergency tap SOS or call 108';

export default function PatientAssistantRoute() {
  const { patientAppUser, patientChatMessages, patientAiTyping, sendPatientAiMessage, clearPatientChat, setActiveRole } = useApp();
  const insets = useSafeAreaInsets();

  // Re-asserted on every focus, so returning to this portal restores its role.
  useFocusEffect(
    useCallback(() => {
      setActiveRole('patient');
    }, [setActiveRole])
  );

  const onActionPress = useCallback(
    (card: AiActionCard) => {
      if (!card.route) return;
      // Bookings from the Patient App run in patient self-service mode.
      const params = card.route === '/book-appointment' ? { ...(card.params ?? {}), patientId: patientAppUser?.id, mode: 'patient' } : card.params;
      openRoute(card.route, params);
    },
    [patientAppUser?.id]
  );

  const callSos = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    Alert.alert(
      'Confirm emergency call',
      'This dials 108 for an ambulance. City Care Emergency & Casualty is open 24 x 7 — Ground Floor, Emergency Block (east gate).',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call 108',
          style: 'destructive',
          onPress: () => {
            Linking.openURL('tel:108').catch(() => Alert.alert('Unable to place call', 'Please dial 108 from your phone.'));
          },
        },
      ]
    );
  };

  const confirmNewChat = () => {
    if (patientAiTyping) return;
    Alert.alert('Start a new chat?', 'This clears your conversation with the assistant.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'New chat', style: 'destructive', onPress: clearPatientChat },
    ]);
  };

  const first = patientAppUser?.name.split(' ')[0] ?? '';

  const header = (
    <Header
      title="MediOS Assistant"
      subtitle={patientAppUser ? `Patient App • ${patientAppUser.name}` : 'Patient App'}
      rightAction={
        <View style={styles.headerActions}>
          {patientChatMessages.length > 0 && (
            <Pressable
              onPress={confirmNewChat}
              disabled={patientAiTyping}
              hitSlop={8}
              style={({ pressed }) => [styles.iconBtn, pressed && { backgroundColor: '#DCE8FF' }, patientAiTyping && { opacity: 0.5 }]}
              accessibilityRole="button"
              accessibilityLabel="Start a new chat"
            >
              <Ionicons name="create-outline" size={18} color={colors.primary} />
            </Pressable>
          )}
          <Pressable
            onPress={callSos}
            hitSlop={6}
            style={({ pressed }) => [styles.sos, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel="SOS — call emergency 108"
          >
            <Ionicons name="call" size={14} color="#FFFFFF" />
            <Text style={styles.sosText}>SOS</Text>
          </Pressable>
        </View>
      }
    />
  );

  if (!patientAppUser) {
    return (
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
        {header}
        <EmptyState
          icon="person-circle-outline"
          title="Sign in to your patient account"
          description="The assistant answers from your own appointments, reports and prescriptions, so it needs your CareSync patient profile."
          actionTitle="Open Patient Portal"
          onActionPress={() => router.replace('/patient-portal')}
          style={styles.empty}
        />
      </SafeAreaView>
    );
  }

  const renderEmpty = (send: (text: string) => void, busy: boolean) => (
    <View>
      <FadeInView style={styles.hero}>
        <RobotAvatar size={88} />
        <Text style={styles.hello}>Hi {first}! 👋</Text>
        <Text style={styles.helloSub}>How can I help you today?</Text>
      </FadeInView>
      <SuggestionList items={QUICK_ACTIONS} onPress={send} disabled={busy} />
      <FollowUpChips items={MORE_QUESTIONS} onPress={send} disabled={busy} label="You can also ask" style={styles.more} />
      <FadeInView delay={300} style={styles.disclaimer}>
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.warningText} />
        <Text style={styles.disclaimerText}>
          I can explain your records and guide you around City Care, but I don't diagnose. A doctor reviews anything clinical. For chest pain,
          breathlessness, fainting or heavy bleeding, tap SOS.
        </Text>
      </FadeInView>
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      {header}
      <ChatConversation
        messages={patientChatMessages}
        typing={patientAiTyping}
        onSend={sendPatientAiMessage}
        onActionPress={onActionPress}
        renderEmpty={renderEmpty}
        suggestions={CHIPS}
        placeholder="Ask about appointments, reports, medicines…"
        typingLabel="Looking at your records…"
        voice={VOICE}
        footerNote={DISCLAIMER}
        bottomInset={Math.max(insets.bottom, spacing.sm)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.danger,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  sosText: {
    color: '#FFFFFF',
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.extraBold,
    letterSpacing: 0.5,
  },
  empty: {
    flex: 1,
  },
  hero: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
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
  more: {
    marginTop: spacing.base,
  },
  disclaimer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.base,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  disclaimerText: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.warningText,
    lineHeight: 17,
  },
});
