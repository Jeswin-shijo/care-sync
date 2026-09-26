import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { LOW_STOCK_THRESHOLD } from '../../data/mockData';
import { canAccess, ModuleId, ownerRoleFor, ROLE_LABEL } from '../../logic/access';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { SectionHeader } from '../../components/common/SectionHeader';
import { FadeInView, PressableScale, PulseDot, stagger } from '../../components/common/Motion';
import { roleConfig } from '../../components/common/RoleSwitcher';
import { ModuleTile, TileBadge } from '../../components/shell/ModuleTile';
import { RolePickerSheet } from '../../components/shell/RolePickerSheet';
import { ALL_MODULES } from '../../components/shell/modules';
import { formatCompactCurrency } from '../../utils/formatters';
import { todayISO } from '../../utils/dates';
import { goToTab } from '../../utils/navigation';

type IconName = keyof typeof Ionicons.glyphMap;

interface Tile {
  id: string;
  module: ModuleId;
  title: string;
  icon: IconName;
  color: string;
  bg: string;
  open: () => void;
  badge?: TileBadge;
}

interface Section {
  title: string;
  tiles: Tile[];
}

const push = (route: string) => () => router.push(route as any);

export default function MoreRoute() {
  const {
    activeRole,
    setActiveRole,
    aiAlerts,
    nurseTasks,
    labPipeline,
    prescriptionReviews,
    medicines,
    radiologyOrders,
    appointments,
    bedSummary,
    bloodStock,
    ambulances,
    supplies,
    todayStats,
  } = useApp();
  const [pickerOpen, setPickerOpen] = useState(false);
  const role = roleConfig(activeRole);

  const sections = useMemo<Section[]>(() => {
    const t = todayISO();
    const critical = aiAlerts.filter((a) => a.severity === 'critical').length;
    const tasksDue = nurseTasks.filter((n) => !n.completed).length;
    const pendingRx = prescriptionReviews.filter((r) => r.status === 'Pending Review').length;
    const lowStock = medicines.filter((m) => m.stock <= LOW_STOCK_THRESHOLD).length;
    const scansToday = radiologyOrders.filter((o) => o.date === t && o.status !== 'Reported').length;
    const todays = appointments.filter((a) => a.date === t && a.status !== 'Cancelled');
    const waiting = todays.filter((a) => a.status === 'Waiting').length;
    const oNeg = bloodStock.find((b) => b.group === 'O-');
    const lowGroups = bloodStock.filter((b) => b.prbc < 5).length;
    const freeAmbulances = ambulances.filter((a) => a.status === 'Available').length;
    const reorder = supplies.filter((s) => s.stock < s.reorderLevel).length;

    const badge = (show: boolean, label: string, tone: TileBadge['tone']): TileBadge | undefined => (show ? { label, tone } : undefined);

    return [
      {
        title: 'Role Portals',
        tiles: [
          { id: 'copilot', module: 'doctor-copilot', title: 'Doctor Copilot', icon: 'sparkles', color: '#1E6BFF', bg: '#E8F1FF', open: push('/doctor-copilot'), badge: badge(aiAlerts.length > 0, `${aiAlerts.length} alerts`, critical ? 'danger' : 'warning') },
          { id: 'nurse', module: 'nurse-portal', title: 'Nurse Ward', icon: 'fitness', color: '#059669', bg: '#E7F8F1', open: push('/nurse-portal'), badge: badge(tasksDue > 0, `${tasksDue} tasks due`, 'warning') },
          { id: 'lab-portal', module: 'lab-portal', title: 'Lab Portal', icon: 'flask', color: '#7C3AED', bg: '#F1EBFF', open: push('/lab-portal'), badge: badge(labPipeline.Abnormal > 0, `${labPipeline.Abnormal} abnormal`, 'danger') },
          { id: 'drug-safety', module: 'pharmacy-review', title: 'Drug Safety', icon: 'shield-checkmark', color: '#D97706', bg: '#FFF4E0', open: push('/pharmacy-review'), badge: badge(pendingRx > 0, `${pendingRx} pending Rx`, 'warning') },
          { id: 'patient-app', module: 'patient-portal', title: 'Patient App', icon: 'phone-portrait', color: '#EC4899', bg: '#FDF2F8', open: push('/patient-portal') },
          { id: 'admin', module: 'admin-portal', title: 'Admin Portal', icon: 'stats-chart', color: '#0284C7', bg: '#E6F4FB', open: push('/admin-portal') },
        ],
      },
      {
        title: 'Clinical & Diagnostics',
        tiles: [
          { id: 'pharmacy', module: 'pharmacy', title: 'Pharmacy', icon: 'medkit', color: '#0D9488', bg: '#E6F7F5', open: push('/pharmacy'), badge: badge(lowStock > 0, `${lowStock} low stock`, 'warning') },
          { id: 'laboratory', module: 'lab', title: 'Laboratory', icon: 'beaker', color: '#7C3AED', bg: '#F1EBFF', open: push('/lab'), badge: badge(labPipeline.New > 0, `${labPipeline.New} new`, 'info') },
          { id: 'radiology', module: 'radiology', title: 'Radiology', icon: 'scan', color: '#1E6BFF', bg: '#E8F1FF', open: push('/radiology'), badge: badge(scansToday > 0, `${scansToday} today`, 'info') },
          { id: 'opd', module: 'opd-consultation', title: 'OPD Consultation', icon: 'medical', color: '#10B981', bg: '#E7F8F1', open: push('/opd-consultation'), badge: badge(waiting > 0, `${waiting} waiting`, 'warning') },
          { id: 'ipd', module: 'ipd-admission', title: 'IPD Admission', icon: 'enter', color: '#8B5CF6', bg: '#F3EEFF', open: push('/ipd-admission'), badge: badge(true, `${bedSummary.available} beds free`, bedSummary.available > 10 ? 'success' : 'warning') },
          { id: 'discharge', module: 'discharge-summary', title: 'Discharge Summary', icon: 'document-text', color: '#14B8A6', bg: '#E6F7F5', open: push('/discharge-summary') },
          { id: 'appointments', module: 'appointments', title: 'Appointments', icon: 'calendar', color: '#F97316', bg: '#FFF1E6', open: push('/appointments'), badge: badge(todays.length > 0, `${todays.length} today`, 'info') },
        ],
      },
      {
        title: 'Operations',
        tiles: [
          {
            id: 'blood-bank',
            module: 'blood-bank',
            title: 'Blood Bank',
            icon: 'water',
            color: '#EF4444',
            bg: '#FDECEC',
            open: push('/blood-bank'),
            badge: oNeg && oNeg.prbc < 5 ? { label: 'O- low', tone: 'danger' } : badge(lowGroups > 0, `${lowGroups} groups low`, 'warning'),
          },
          { id: 'ambulance', module: 'ambulance', title: 'Ambulance', icon: 'car', color: '#F43F5E', bg: '#FFECEF', open: push('/ambulance'), badge: badge(true, `${freeAmbulances} free`, freeAmbulances ? 'success' : 'danger') },
          {
            id: 'beds',
            module: 'bed-management',
            title: 'Bed Management',
            icon: 'bed',
            color: '#1E6BFF',
            bg: '#E8F1FF',
            open: push('/bed-management'),
            badge: bedSummary.icuAvailable
              ? { label: `${bedSummary.icuAvailable} ICU free`, tone: bedSummary.icuAvailable <= 2 ? 'warning' : 'success' }
              : { label: 'ICU full', tone: 'danger' },
          },
          { id: 'inventory', module: 'inventory', title: 'Inventory', icon: 'cube', color: '#10B981', bg: '#E7F8F1', open: push('/inventory'), badge: badge(reorder > 0, `${reorder} to reorder`, 'warning') },
          { id: 'documents', module: 'documents', title: 'Document Support', icon: 'document-attach', color: '#0284C7', bg: '#E6F4FB', open: push('/documents') },
        ],
      },
      {
        title: 'Finance & Admin',
        tiles: [
          { id: 'billing', module: 'billing', title: 'Billing', icon: 'receipt', color: '#1E6BFF', bg: '#E8F1FF', open: () => goToTab('billing'), badge: badge(todayStats.pendingCount > 0, `${todayStats.pendingCount} pending`, 'warning') },
          { id: 'finance', module: 'financial-management', title: 'Financial Management', icon: 'trending-up', color: '#059669', bg: '#E7F8F1', open: push('/financial-management'), badge: badge(true, `${formatCompactCurrency(todayStats.todayCollection)} today`, 'success') },
          { id: 'reports', module: 'reports', title: 'Reports', icon: 'bar-chart', color: '#F97316', bg: '#FFF1E6', open: push('/reports') },
          { id: 'templates', module: 'billing', title: 'Receipt Templates', icon: 'albums', color: '#8B5CF6', bg: '#F3EEFF', open: push('/receipt-templates') },
          { id: 'settings', module: 'settings', title: 'Settings', icon: 'settings', color: '#475569', bg: '#EEF2F6', open: push('/settings') },
          { id: 'help', module: 'help-support', title: 'Help & Support', icon: 'help-buoy', color: '#1E6BFF', bg: '#E8F1FF', open: push('/help-support') },
        ],
      },
    ];
  }, [aiAlerts, nurseTasks, labPipeline, prescriptionReviews, medicines, radiologyOrders, appointments, bedSummary, bloodStock, ambulances, supplies, todayStats]);

  const accessible = ALL_MODULES.filter((m) => canAccess(activeRole, m)).length;

  const openTile = (tile: Tile) => {
    if (canAccess(activeRole, tile.module)) {
      tile.open();
      return;
    }
    const owner = ownerRoleFor(tile.module);
    Alert.alert(
      `Restricted for ${ROLE_LABEL[activeRole]}`,
      `${tile.title} is limited to the ${ROLE_LABEL[owner]} role under role-based access control. Switching roles is recorded in the audit trail.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Switch to ${ROLE_LABEL[owner]}`,
          onPress: () => {
            setActiveRole(owner);
            tile.open();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header title="More Features" subtitle="Every CareSync module in one place" showBack={false} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Who is signed in, and what they can open */}
        <FadeInView>
          <PressableScale
            onPress={() => setPickerOpen(true)}
            scaleTo={0.98}
            style={styles.accessCard}
            accessibilityRole="button"
            accessibilityLabel={`Signed in as ${ROLE_LABEL[activeRole]}. ${accessible} of ${ALL_MODULES.length} modules available. Switch role`}
          >
            <View style={[styles.accessIcon, { backgroundColor: role?.bg ?? colors.primaryLight }]}>
              <Ionicons name={role?.icon ?? 'person'} size={20} color={role?.color ?? colors.primary} />
            </View>
            <View style={styles.accessBody}>
              <View style={styles.accessTitleRow}>
                <PulseDot color={role?.color ?? colors.success} size={6} />
                <Text style={styles.accessTitle}>Signed in as {ROLE_LABEL[activeRole]}</Text>
              </View>
              <Text style={styles.accessSub}>
                {accessible} of {ALL_MODULES.length} modules available • <Ionicons name="lock-closed" size={10} color={colors.textMuted} /> restricted
              </Text>
            </View>
            <View style={styles.switchBtn}>
              <Ionicons name="swap-horizontal" size={14} color={colors.primary} />
              <Text style={styles.switchText}>Switch</Text>
            </View>
          </PressableScale>
        </FadeInView>

        {sections.map((section, si) => {
          const locked = section.tiles.filter((tile) => !canAccess(activeRole, tile.module)).length;
          return (
            <FadeInView key={section.title} delay={stagger(si + 1, 80)}>
              <SectionHeader title={section.title} meta={locked ? `${locked} locked` : undefined} />
              <View style={styles.gridCard}>
                {section.tiles.map((tile) => (
                  <ModuleTile
                    key={tile.id}
                    title={tile.title}
                    icon={tile.icon}
                    color={tile.color}
                    bg={tile.bg}
                    badge={tile.badge}
                    locked={!canAccess(activeRole, tile.module)}
                    onPress={() => openTile(tile)}
                  />
                ))}
              </View>
            </FadeInView>
          );
        })}

        <Text style={styles.footnote}>
          Tiles show live counts from the hospital record. Locked modules can be opened after switching to the owning role.
        </Text>
      </ScrollView>

      <RolePickerSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} />
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
  accessCard: {
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
  accessIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessBody: {
    flex: 1,
    minWidth: 0,
  },
  accessTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accessTitle: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    flexShrink: 1,
  },
  accessSub: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    marginTop: 3,
  },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    minHeight: 34,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  switchText: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  gridCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  footnote: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 16,
    paddingHorizontal: spacing.base,
  },
});
