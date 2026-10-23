import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSession } from '../context/SessionContext';
import { API_URL } from '../api/config';
import { errorMessage } from '../api/client';
import { colors, radius, spacing, typography } from '../constants/theme';
import { AppLogo } from '../components/common/AppLogo';
import { Button } from '../components/common/Button';
import { FadeInView } from '../components/common/Motion';
import { KeyboardAwareContainer } from '../components/common/KeyboardAware';
import { FieldInput, FormField } from '../components/clinical/FormField';

/** Seeded development accounts (backend `npm run seed`); never shown in release builds. */
const DEV_ACCOUNTS = [
  { label: 'Doctor', email: 'doctor@medios.ai' },
  { label: 'Admin', email: 'admin@medios.ai' },
  { label: 'Nurse', email: 'nurse@medios.ai' },
  { label: 'Front desk', email: 'frontdesk@medios.ai' },
  { label: 'Pharmacy', email: 'pharmacy@medios.ai' },
  { label: 'Lab', email: 'lab@medios.ai' },
];
const DEV_PASSWORD = 'Admin@123';

/**
 * Sign-in with a MediOS staff account. On success the session switches to live
 * and the router returns to the welcome screen, which loads the hospital and
 * opens the app.
 */
export default function LoginScreen() {
  const { signIn, startDemo } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const submit = async () => {
    if (busy) return;
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#FFFFFF', '#F3F8FF', '#E8F1FF']} style={StyleSheet.absoluteFill} />
      <KeyboardAwareContainer>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <FadeInView style={styles.brand}>
            <View style={styles.logoBadge}>
              <AppLogo size={56} />
            </View>
            <Text style={styles.title} accessibilityRole="header">
              Sign in
            </Text>
            <Text style={styles.subtitle}>Use your MediOS staff account. Your role decides what you can open.</Text>
          </FadeInView>

          <FadeInView delay={120} style={styles.card}>
            <FormField label="Email">
              <FieldInput
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  setError(null);
                }}
                placeholder="name@hospital.com"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                textContentType="username"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                invalid={!!error}
                accessibilityLabel="Email"
                left={<Ionicons name="mail-outline" size={18} color={colors.textMuted} />}
              />
            </FormField>
            <FormField label="Password" style={{ marginBottom: spacing.sm }}>
              <FieldInput
                ref={passwordRef}
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  setError(null);
                }}
                placeholder="Password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={submit}
                invalid={!!error}
                accessibilityLabel="Password"
                left={<Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />}
                right={
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.textSecondary} />
                  </Pressable>
                }
              />
            </FormField>

            {error && (
              <View style={styles.errorBox} accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Button title={busy ? 'Signing in…' : 'Sign in'} onPress={submit} loading={busy} fullWidth size="lg" style={{ marginTop: spacing.md }} />
          </FadeInView>

          {__DEV__ && (
            <FadeInView delay={200} style={styles.devBox}>
              <Text style={styles.devTitle}>Development accounts • password {DEV_PASSWORD}</Text>
              <View style={styles.devChips}>
                {DEV_ACCOUNTS.map((a) => (
                  <Pressable
                    key={a.email}
                    onPress={() => {
                      setEmail(a.email);
                      setPassword(DEV_PASSWORD);
                      setError(null);
                    }}
                    style={({ pressed }) => [styles.devChip, pressed && { opacity: 0.7 }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Fill in the ${a.label} account`}
                  >
                    <Text style={styles.devChipText}>{a.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.devServer}>Server: {API_URL}</Text>
            </FadeInView>
          )}

          <FadeInView delay={260} style={styles.demo}>
            <Pressable onPress={startDemo} accessibilityRole="button" hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.6 }}>
              <Text style={styles.demoLink}>Explore the offline demo</Text>
            </Pressable>
            <Text style={styles.demoHint}>Sample hospital data on this device only. Nothing is saved.</Text>
          </FadeInView>
        </ScrollView>
      </KeyboardAwareContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  brand: { alignItems: 'center', marginBottom: spacing.xl },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: typography.fontWeights.extraBold,
    color: '#0B3B8C',
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerLight,
    marginTop: spacing.sm,
  },
  errorText: { flex: 1, fontSize: typography.fontSizes.sm, color: colors.dangerText, lineHeight: 19 },
  devBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  devTitle: { fontSize: typography.fontSizes.xs + 1, color: colors.textSecondary, fontWeight: typography.fontWeights.semiBold },
  devChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  devChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  devChipText: { fontSize: typography.fontSizes.sm, color: colors.primaryDark, fontWeight: typography.fontWeights.semiBold },
  devServer: { marginTop: spacing.sm, fontSize: typography.fontSizes.xs, color: colors.textMuted },
  demo: { alignItems: 'center', marginTop: spacing.xl },
  demoLink: { fontSize: typography.fontSizes.md, color: colors.primary, fontWeight: typography.fontWeights.bold },
  demoHint: { marginTop: 4, fontSize: typography.fontSizes.xs + 1, color: colors.textMuted, textAlign: 'center' },
});
