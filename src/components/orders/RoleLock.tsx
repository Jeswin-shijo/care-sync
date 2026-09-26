import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '../../context/AppContext';
import type { UserRole } from '../../context/AppContext';
import { ROLE_LABEL } from '../../logic/access';
import type { ModuleId } from '../../logic/access';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { Header } from '../common/Header';
import { Button } from '../common/Button';
import { FadeInView } from '../common/Motion';

/** The role that normally works each order module (used for the one-tap switch). */
const WORKING_ROLE: Partial<Record<ModuleId, UserRole>> = {
  pharmacy: 'pharmacy',
  lab: 'lab',
  radiology: 'doctor',
  appointments: 'doctor',
};

interface RoleLockScreenProps {
  title: string;
  module: ModuleId;
  /** What the module does, e.g. "Dispensing and billing medicines". */
  purpose: string;
}

/** Full-screen mock-RBAC lock with a one-tap role switch (recorded in the audit log by the store). */
export const RoleLockScreen: React.FC<RoleLockScreenProps> = ({ title, module, purpose }) => {
  const { activeRole, setActiveRole } = useApp();
  const target = WORKING_ROLE[module] ?? 'admin';
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header title={title} />
      <FadeInView style={styles.wrap}>
        <View style={styles.lock}>
          <Ionicons name="lock-closed" size={30} color={colors.warning} />
        </View>
        <Text style={styles.title}>Restricted for {ROLE_LABEL[activeRole]}</Text>
        <Text style={styles.body}>
          {purpose} isn’t part of the {ROLE_LABEL[activeRole]} role’s access. Switch to {ROLE_LABEL[target]} to continue — role switches are
          recorded in the audit log.
        </Text>
        <Button
          title={`Switch to ${ROLE_LABEL[target]}`}
          onPress={() => setActiveRole(target)}
          size="lg"
          icon={<Ionicons name="swap-horizontal" size={18} color="#FFFFFF" />}
          style={styles.primary}
        />
        <Button title="Go Back" variant="ghost" onPress={leave} style={styles.secondary} />
      </FadeInView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  lock: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: colors.warning + '55',
  },
  title: { fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.bold, color: colors.text, textAlign: 'center' },
  body: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing.sm,
    borderRadius: radius.md,
  },
  primary: { alignSelf: 'stretch', marginTop: spacing.lg },
  secondary: { alignSelf: 'stretch', marginTop: spacing.sm },
});
