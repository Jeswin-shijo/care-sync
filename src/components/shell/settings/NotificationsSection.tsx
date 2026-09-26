import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '../../../context/AppContext';
import { useToast } from '../../../context/ToastContext';
import { colors, radius, spacing, typography } from '../../../constants/theme';
import { FadeInView } from '../../common/Motion';
import { SettingsGroup, SettingsRow, ToggleRow } from '../SettingsRow';
import { SectionScroll } from './common';

type ToggleKey = 'notificationsEnabled' | 'smsAlerts' | 'whatsappAlerts' | 'emailReports';

const TOGGLES: Array<{
  key: ToggleKey;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  title: string;
  subtitle: string;
}> = [
  { key: 'notificationsEnabled', icon: 'notifications', color: colors.primary, bg: colors.primaryLight, title: 'In-app notifications', subtitle: 'Appointments, payments, lab results & drug-safety alerts' },
  { key: 'smsAlerts', icon: 'chatbox-ellipses', color: '#0D9488', bg: '#F0FDFA', title: 'SMS alerts', subtitle: 'Appointment reminders & payment receipts sent to patients' },
  { key: 'whatsappAlerts', icon: 'logo-whatsapp', color: '#16A34A', bg: '#ECFDF5', title: 'WhatsApp messages', subtitle: 'Reports, reminders and receipts via WhatsApp Business' },
  { key: 'emailReports', icon: 'mail', color: '#F59E0B', bg: '#FFFBEB', title: 'Email reports', subtitle: 'Daily collection & census report to administrators' },
];

export const NotificationsSection: React.FC = () => {
  const { settings, updateSettings, unreadCount, notifications } = useApp();
  const { showToast } = useToast();

  const toggle = (key: ToggleKey, title: string, next: boolean) => {
    updateSettings({ [key]: next } as Partial<typeof settings>);
    showToast({ type: next ? 'success' : 'info', message: `${title} turned ${next ? 'on' : 'off'}` });
  };

  const channels = TOGGLES.slice(1).filter((t) => settings[t.key]).length;

  return (
    <SectionScroll>
      <FadeInView>
        <View style={styles.summary}>
          <Ionicons name={settings.notificationsEnabled ? 'notifications' : 'notifications-off'} size={22} color={settings.notificationsEnabled ? colors.primary : colors.textMuted} />
          <View style={styles.summaryBody}>
            <Text style={styles.summaryTitle}>{settings.notificationsEnabled ? 'Notifications are on' : 'Notifications are paused'}</Text>
            <Text style={styles.summaryText}>
              {channels} of 3 patient & report channels active • {unreadCount} unread in the notification centre
            </Text>
          </View>
        </View>
      </FadeInView>

      <FadeInView delay={60}>
        <SettingsGroup title="Staff alerts">
          <ToggleRow
            icon={TOGGLES[0].icon}
            iconColor={TOGGLES[0].color}
            iconBg={TOGGLES[0].bg}
            title={TOGGLES[0].title}
            subtitle={TOGGLES[0].subtitle}
            value={settings.notificationsEnabled}
            onValueChange={(v) => toggle('notificationsEnabled', TOGGLES[0].title, v)}
          />
          <SettingsRow
            icon="file-tray-full"
            iconColor="#475569"
            iconBg={colors.cardMuted}
            title="Notification centre"
            subtitle={`${notifications.length} notifications • ${unreadCount} unread`}
            onPress={() => router.push('/notifications')}
          />
        </SettingsGroup>
      </FadeInView>

      <FadeInView delay={120}>
        <SettingsGroup title="Patient & report channels" caption="Messages go out from the hospital's registered sender IDs.">
          {TOGGLES.slice(1).map((t) => (
            <ToggleRow
              key={t.key}
              icon={t.icon}
              iconColor={t.color}
              iconBg={t.bg}
              title={t.title}
              subtitle={t.subtitle}
              value={settings[t.key]}
              onValueChange={(v) => toggle(t.key, t.title, v)}
            />
          ))}
        </SettingsGroup>
      </FadeInView>

      <Text style={styles.footnote}>
        Critical lab values and unsafe-prescription flags always reach the treating doctor, even when notifications are paused.
      </Text>
    </SectionScroll>
  );
};

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  summaryBody: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  summaryText: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
  footnote: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textMuted,
    marginTop: spacing.lg,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
});
