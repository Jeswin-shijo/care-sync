import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { EmptyState } from '../../components/common/EmptyState';
import { HospitalProfileSection } from '../../components/shell/settings/HospitalProfileSection';
import { BillingSection } from '../../components/shell/settings/BillingSection';
import { DepartmentsSection } from '../../components/shell/settings/DepartmentsSection';
import { UsersRolesSection } from '../../components/shell/settings/UsersRolesSection';
import { BranchesSection } from '../../components/shell/settings/BranchesSection';
import { LanguageSection } from '../../components/shell/settings/LanguageSection';
import { NotificationsSection } from '../../components/shell/settings/NotificationsSection';
import { SecuritySection } from '../../components/shell/settings/SecuritySection';

const SECTIONS: Record<string, { title: string; subtitle: string; Component: React.FC }> = {
  'hospital-profile': { title: 'Hospital Profile', subtitle: 'Name, address, GST & registration', Component: HospitalProfileSection },
  billing: { title: 'Billing Settings', subtitle: 'Tax, payment modes & receipts', Component: BillingSection },
  departments: { title: 'Departments', subtitle: 'Services, heads & doctors', Component: DepartmentsSection },
  'users-roles': { title: 'Users & Roles', subtitle: 'Staff access & permissions', Component: UsersRolesSection },
  branches: { title: 'Branches', subtitle: 'Multi-branch management', Component: BranchesSection },
  language: { title: 'Language', subtitle: 'App display language', Component: LanguageSection },
  notifications: { title: 'Notifications', subtitle: 'Alerts, SMS, WhatsApp & email', Component: NotificationsSection },
  security: { title: 'Security & Compliance', subtitle: 'RBAC, audit log & data protection', Component: SecuritySection },
};

export default function SettingsSectionRoute() {
  const params = useLocalSearchParams<{ section?: string | string[] }>();
  const key = Array.isArray(params.section) ? params.section[0] : params.section;
  const section = key ? SECTIONS[key] : undefined;

  if (!section) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <Header title="Settings" showBack />
        <EmptyState
          icon="settings-outline"
          title="Setting not found"
          description={key ? `There is no "${key}" settings page.` : 'No settings page was selected.'}
          actionTitle="Back to Settings"
          onActionPress={() => (router.canGoBack() ? router.back() : router.replace('/settings'))}
          style={styles.empty}
        />
      </SafeAreaView>
    );
  }

  const { Component } = section;
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header title={section.title} subtitle={section.subtitle} showBack />
      <Component />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  empty: {
    flex: 1,
  },
});
