import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { ROLE_LABEL } from '../logic/access';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { FadeInView, PressableScale, stagger } from '../components/common/Motion';
import { SettingsGroup, SettingsRow, ToggleRow } from '../components/shell/SettingsRow';
import { languageLabel } from '../components/shell/settings/LanguageSection';
import { APP_VERSION_LABEL } from '../components/shell/appInfo';
import { useScrollBottomPadding } from '../components/shell/layout';

const open = (section: string) => () => router.push({ pathname: '/settings/[section]', params: { section } });

export default function SettingsRoute() {
  const { hospitalProfile, settings, updateSettings, departments, staff, branches, activeRole, auditLog } = useApp();
  const { showToast } = useToast();
  const bottomPad = useScrollBottomPadding();

  const onDuty = staff.filter((s) => s.status === 'On Duty').length;
  const modes = Object.values(settings.paymentModes).filter(Boolean).length;
  const channels = [settings.smsAlerts && 'SMS', settings.whatsappAlerts && 'WhatsApp', settings.emailReports && 'Email'].filter(Boolean);

  const toggleNotifications = (next: boolean) => {
    updateSettings({ notificationsEnabled: next });
    showToast({
      type: next ? 'success' : 'info',
      message: next ? 'Notifications turned on' : 'Notifications paused — critical alerts still appear in MediOS AI Alerts',
    });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header title="Settings" showBack />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}>
        {/* Hospital identity */}
        <FadeInView>
          <PressableScale
            onPress={open('hospital-profile')}
            scaleTo={0.98}
            style={styles.profileCard}
            accessibilityRole="button"
            accessibilityLabel={`${hospitalProfile.name}, ${hospitalProfile.address}. Edit hospital profile`}
          >
            <View style={styles.logo}>
              <Ionicons name="add" size={26} color="#FFFFFF" />
            </View>
            <View style={styles.profileText}>
              <Text style={styles.profileName} numberOfLines={2}>
                {hospitalProfile.name}
              </Text>
              <Text style={styles.profileMeta} numberOfLines={1}>
                {hospitalProfile.address}
              </Text>
              <Text style={styles.profileMeta} numberOfLines={1}>
                GSTIN {hospitalProfile.gstin} • {ROLE_LABEL[activeRole]}
              </Text>
            </View>
            <View style={styles.editPill}>
              <Ionicons name="create-outline" size={14} color={colors.primary} />
              <Text style={styles.editText}>Edit</Text>
            </View>
          </PressableScale>
        </FadeInView>

        <FadeInView delay={stagger(1)}>
          <SettingsGroup title="Hospital Settings">
            <SettingsRow icon="business" title="Hospital Profile" subtitle="Name, address, GST, logo" onPress={open('hospital-profile')} />
            <SettingsRow
              icon="git-network"
              iconColor="#F59E0B"
              iconBg="#FFFBEB"
              title="Departments"
              subtitle={`Manage departments & services • ${departments.length} active`}
              onPress={open('departments')}
            />
            <SettingsRow
              icon="people"
              iconColor="#6366F1"
              iconBg="#EEF2FF"
              title="Users & Roles"
              subtitle={`Doctors & staff access • ${onDuty}/${staff.length} on duty`}
              onPress={open('users-roles')}
            />
            <SettingsRow
              icon="card"
              iconColor="#10B981"
              iconBg="#ECFDF5"
              title="Billing Settings"
              subtitle={`Tax, GST, payment methods • GST ${settings.gstPercent}%, ${modes} modes`}
              onPress={open('billing')}
            />
            <SettingsRow
              icon="receipt"
              iconColor="#8B5CF6"
              iconBg="#F5F3FF"
              title="Receipt Templates"
              subtitle="Customize templates & numbering"
              onPress={() => router.push('/receipt-templates')}
            />
            <SettingsRow
              icon="location"
              iconColor="#0D9488"
              iconBg="#F0FDFA"
              title="Branches"
              subtitle={`Multi-branch management • ${branches.length} locations`}
              onPress={open('branches')}
            />
          </SettingsGroup>
        </FadeInView>

        <FadeInView delay={stagger(2)}>
          <SettingsGroup title="App Settings">
            <ToggleRow
              icon={settings.notificationsEnabled ? 'notifications' : 'notifications-off'}
              title="Notifications"
              subtitle={
                settings.notificationsEnabled
                  ? `Payment alerts, reminders${channels.length ? ` • ${channels.join(', ')}` : ''}`
                  : 'Paused'
              }
              value={settings.notificationsEnabled}
              onValueChange={toggleNotifications}
              onPress={open('notifications')}
            />
            <SettingsRow
              icon="language"
              iconColor="#64748B"
              iconBg="#F1F5F9"
              title="Language"
              subtitle={languageLabel(settings.language)}
              onPress={open('language')}
            />
          </SettingsGroup>
        </FadeInView>

        <FadeInView delay={stagger(3)}>
          <SettingsGroup title="Security & Compliance">
            <SettingsRow
              icon="shield-checkmark"
              iconColor="#047857"
              iconBg="#ECFDF5"
              title="Security & Compliance"
              subtitle={`Role-based access • audit log (${auditLog.length}) • DPDP / HIPAA-ready`}
              onPress={open('security')}
            />
          </SettingsGroup>
        </FadeInView>

        <FadeInView delay={stagger(4)}>
          <SettingsGroup title="Support">
            <SettingsRow
              icon="help-buoy"
              iconColor="#EC4899"
              iconBg="#FDF2F8"
              title="Help & Support"
              subtitle="FAQs, contact the help desk, raise a ticket"
              onPress={() => router.push('/help-support')}
            />
          </SettingsGroup>
        </FadeInView>

        <View style={styles.versionFooter}>
          <Text style={styles.versionText}>{APP_VERSION_LABEL}</Text>
          <Text style={styles.versionSub}>{hospitalProfile.name}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  profileMeta: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    minHeight: 32,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  editText: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  versionFooter: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  versionText: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
  },
  versionSub: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
});
