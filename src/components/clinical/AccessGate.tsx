import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { canAccess, ModuleId, ownerRoleFor, ROLE_LABEL } from '../../logic/access';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { Button } from '../common/Button';
import { FadeInView } from '../common/Motion';
import { leaveScreen } from './useLeaveGuard';

interface AccessGateProps {
  module: ModuleId;
  /** What the module does, e.g. "Recording OPD consultations". */
  purpose: string;
  children: React.ReactNode;
}

/**
 * Mock RBAC: when the active role may not use this module, show a lock with a
 * one-tap switch to the owning role instead of silently letting anyone in.
 */
export const AccessGate: React.FC<AccessGateProps> = ({ module, purpose, children }) => {
  const { activeRole, setActiveRole } = useApp();
  if (canAccess(activeRole, module)) return <>{children}</>;
  const owner = ownerRoleFor(module);
  return (
    <FadeInView style={styles.wrap}>
      <View style={styles.lock}>
        <Ionicons name="lock-closed" size={30} color={colors.warning} />
      </View>
      <Text style={styles.title}>Restricted for {ROLE_LABEL[activeRole]}</Text>
      <Text style={styles.body}>
        {purpose} isn’t part of the {ROLE_LABEL[activeRole]} role’s access. Switch to {ROLE_LABEL[owner]} to continue — role
        switches are recorded in the audit log.
      </Text>
      <Button
        title={`Switch to ${ROLE_LABEL[owner]}`}
        onPress={() => setActiveRole(owner)}
        icon={<Ionicons name="swap-horizontal" size={18} color="#FFFFFF" />}
        style={{ alignSelf: 'stretch', marginTop: spacing.lg }}
      />
      <Button title="Go Back" variant="ghost" onPress={leaveScreen} style={{ alignSelf: 'stretch', marginTop: spacing.sm }} />
    </FadeInView>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
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
  title: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing.sm,
    borderRadius: radius.md,
  },
});
