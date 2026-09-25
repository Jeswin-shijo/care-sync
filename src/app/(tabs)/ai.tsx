import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';
import { Header } from '../../components/common/Header';

const PROMPT_SUGGESTIONS = [
  "Show today's appointments",
  "Generate today's OPD collection report",
  "Find all patients with pending bills above ₹10,000",
  "Create a discharge summary for Ananya S",
  "Find the receipt for Rahul's payment yesterday",
];

export default function AiAssistantRoute() {
  const { aiChatMessages, sendAiMessage } = useApp();

  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;
    sendAiMessage(text);
    setInputText('');
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const handleActionCardPress = (actionCard: any) => {
    if (actionCard.route === 'Billing') {
      router.push('/(tabs)/billing');
    } else if (actionCard.route === 'FinancialManagement') {
      router.push('/financial-management');
    } else if (actionCard.route === 'DischargeSummary') {
      router.push('/discharge-summary');
    } else if (actionCard.route === 'ReceiptDetail') {
      router.push({
        pathname: '/receipt/[id]',
        params: { id: actionCard.params?.invoiceId || 'inv-2' },
      });
    } else if (actionCard.route === 'Appointments') {
      router.push('/appointments');
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header
        title="AI Assistant"
        showBack={false}
        rightAction={
          <View style={styles.botBadge}>
            <Ionicons name="sparkles" size={16} color={colors.primary} />
          </View>
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {/* AI Robot Header Banner */}
          <View style={styles.welcomeBanner}>
            <View style={styles.botIconCircle}>
              <Ionicons name="hardware-chip" size={32} color={colors.primary} />
            </View>
            <Text style={styles.greetingTitle}>Hello Dr. Priya 👋</Text>
            <Text style={styles.greetingSubtitle}>How can I help you today?</Text>
          </View>

          {/* Quick Prompts List */}
          <Text style={styles.quickPromptLabel}>Suggested Actions</Text>
          <View style={styles.promptsContainer}>
            {PROMPT_SUGGESTIONS.map((prompt, index) => (
              <TouchableOpacity
                key={index}
                style={styles.promptChip}
                activeOpacity={0.75}
                onPress={() => handleSend(prompt)}
              >
                <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
                <Text style={styles.promptText}>{prompt}</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Chat Messages */}
          {aiChatMessages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <View
                key={msg.id}
                style={[
                  styles.messageRow,
                  isUser ? styles.userMessageRow : styles.botMessageRow,
                ]}
              >
                {!isUser && (
                  <View style={styles.botMiniAvatar}>
                    <Ionicons name="hardware-chip" size={14} color="#FFFFFF" />
                  </View>
                )}

                <View style={{ maxWidth: '82%' }}>
                  <View
                    style={[
                      styles.bubble,
                      isUser ? styles.userBubble : styles.botBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        isUser ? styles.userMessageText : styles.botMessageText,
                      ]}
                    >
                      {msg.text}
                    </Text>
                  </View>

                  {/* Interactive Action Card */}
                  {msg.actionCard && (
                    <TouchableOpacity
                      style={styles.actionCard}
                      activeOpacity={0.8}
                      onPress={() => handleActionCardPress(msg.actionCard)}
                    >
                      <View style={styles.actionCardHeader}>
                        <Ionicons name="link-outline" size={16} color={colors.primary} />
                        <Text style={styles.actionCardTitle}>{msg.actionCard.title}</Text>
                      </View>
                      <Text style={styles.actionCardDesc}>{msg.actionCard.description}</Text>
                      {msg.actionCard.actionLabel && (
                        <View style={styles.cardBtn}>
                          <Text style={styles.cardBtnText}>
                            {msg.actionCard.actionLabel} →
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Bottom Input Field */}
        <View style={styles.inputContainer}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask anything about your hospital..."
            placeholderTextColor={colors.textMuted}
            style={styles.textInput}
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              inputText.trim().length > 0 && styles.sendBtnActive,
            ]}
            onPress={() => handleSend()}
            disabled={!inputText.trim()}
          >
            <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  botBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: 24,
  },
  welcomeBanner: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  botIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  greetingTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  greetingSubtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  quickPromptLabel: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  promptsContainer: {
    gap: 8,
    marginBottom: spacing.lg,
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 10,
    ...shadows.sm,
  },
  promptText: {
    flex: 1,
    fontSize: 12,
    fontWeight: typography.fontWeights.medium,
    color: colors.text,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-end',
    gap: 8,
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  botMessageRow: {
    justifyContent: 'flex-start',
  },
  botMiniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 2,
  },
  botBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderBottomLeftRadius: 2,
    ...shadows.sm,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  botMessageText: {
    color: colors.text,
  },
  actionCard: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: 8,
  },
  actionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  actionCardTitle: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.primaryDark,
  },
  actionCardDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  cardBtn: {
    alignSelf: 'flex-start',
  },
  cardBtnText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.cardMuted,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.text,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: colors.primary,
  },
});
