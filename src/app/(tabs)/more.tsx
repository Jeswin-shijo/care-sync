import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { useSession } from '../../context/SessionContext';
import { useAlert } from '../../context/AlertContext';
import { ROLE_LABEL } from '../../logic/access';
import { Avatar } from '../../components/common/Avatar';
import { LOW_STOCK_THRESHOLD } from '../../data/mockData';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { SectionHeader } from '../../components/common/SectionHeader';
import { FadeInView, stagger } from '../../components/common/Motion';
import { ModuleTile, TileBadge } from '../../components/shell/ModuleTile';
import { formatCompactCurrency } from '../../utils/formatters';
import { todayISO } from '../../utils/dates';
import { goToTab } from '../../utils/navigation';

type IconName = keyof typeof Ionicons.glyphMap;

interface Tile {
  id: string;
  title: string;
  icon: IconName;
  color: string;
  bg: string;
  open: () => void;
  badge?: TileBadge;
}

const push = (route: string) => () => router.push(route as any);

/** Modules not on the backend yet: a signed-in account opens them on sample data. */
const PREVIEW_TILES = new Set(['pharmacy', 'laboratory', 'radiology', 'blood-bank', 'ambulance', 'bed-management', 'inventory', 'ipd', 'discharge', 'finance']);
const PREVIEW_BADGE: TileBadge = { label: 'Preview', tone: 'neutral' };

export default function MoreRoute() {
  const {
    medicines,
    labPipeline,
    radiologyOrders,
    bloodStock,
    ambulances,
    bedSummary,
    supplies,
    todayStats,
    dataMode,
    activeRole,
    actorName,
    hospitalProfile,
  } = useApp();
  const { status, user, signOut } = useSession();
  const { showAlert } = useAlert();
  const live = dataMode === 'live';
  // Counts on preview tiles would come from the sample hospital; say "Preview" instead.
  const tileBadge = (tile: Tile) => (live && PREVIEW_TILES.has(tile.id) ? PREVIEW_BADGE : tile.badge);

  const confirmSignOut = () =>
    showAlert({
      title: status === 'demo' ? 'Leave the offline demo?' : 'Sign out?',
      message:
        status === 'demo'
          ? 'Changes you made to the sample hospital are discarded.'
          : 'Patient records are removed from this device until you sign in again.',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: status === 'demo' ? 'Leave demo' : 'Sign out', style: 'destructive', onPress: () => signOut() },
      ],
    });

  const t = todayISO();
  const lowStock = medicines.filter((m) => m.stock <= LOW_STOCK_THRESHOLD).length;
  const scansToday = radiologyOrders.filter((o) => o.date === t && o.status !== 'Reported').length;
  const oNeg = bloodStock.find((b) => b.group === 'O-');
  const freeAmbulances = ambulances.filter((a) => a.status === 'Available').length;
  const reorder = supplies.filter((s) => s.stock < s.reorderLevel).length;

  const badge = (show: boolean, label: string, tone: TileBadge['tone']): TileBadge | undefined =>
    show ? { label, tone } : undefined;

  // Primary CareSync features matching design mockup (10 modules + Settings & Templates)
  const mainModules: Tile[] = useMemo(
    () => [
      {
        id: 'pharmacy',
        title: 'Pharmacy',
        icon: 'medkit',
        color: '#0D9488',
        bg: '#E6F7F5',
        open: push('/pharmacy'),
        badge: badge(lowStock > 0, `${lowStock} low`, 'warning'),
      },
      {
        id: 'laboratory',
        title: 'Laboratory',
        icon: 'flask',
        color: '#7C3AED',
        bg: '#F1EBFF',
        open: push('/lab'),
        badge: badge(labPipeline.New > 0, `${labPipeline.New} new`, 'info'),
      },
      {
        id: 'radiology',
        title: 'Radiology',
        icon: 'scan',
        color: '#1E6BFF',
        bg: '#E8F1FF',
        open: push('/radiology'),
        badge: badge(scansToday > 0, `${scansToday} today`, 'info'),
      },
      {
        id: 'blood-bank',
        title: 'Blood Bank',
        icon: 'water',
        color: '#EF4444',
        bg: '#FDECEC',
        open: push('/blood-bank'),
        badge: oNeg && oNeg.prbc < 5 ? { label: 'O- low', tone: 'danger' } : undefined,
      },
      {
        id: 'ambulance',
        title: 'Ambulance',
        icon: 'car',
        color: '#F43F5E',
        bg: '#FFECEF',
        open: push('/ambulance'),
        badge: badge(true, `${freeAmbulances} free`, freeAmbulances ? 'success' : 'danger'),
      },
      {
        id: 'bed-management',
        title: 'Bed Mgmt',
        icon: 'bed',
        color: '#1E6BFF',
        bg: '#E8F1FF',
        open: push('/bed-management'),
        badge: badge(true, `${bedSummary.available} free`, 'neutral'),
      },
      {
        id: 'inventory',
        title: 'Inventory',
        icon: 'cube',
        color: '#10B981',
        bg: '#E7F8F1',
        open: push('/inventory'),
        badge: badge(reorder > 0, `${reorder} alert`, 'warning'),
      },
      {
        id: 'reports',
        title: 'Reports',
        icon: 'bar-chart',
        color: '#F97316',
        bg: '#FFF1E6',
        open: push('/reports'),
      },
      {
        id: 'documents',
        title: 'Documents',
        icon: 'document-attach',
        color: '#0284C7',
        bg: '#E6F4FB',
        open: push('/documents'),
      },
      {
        id: 'help',
        title: 'Help Support',
        icon: 'help-circle',
        color: '#1E6BFF',
        bg: '#E8F1FF',
        open: push('/help-support'),
      },
      {
        id: 'settings',
        title: 'Settings',
        icon: 'settings',
        color: '#475569',
        bg: '#EEF2F6',
        open: push('/settings'),
      },
      {
        id: 'templates',
        title: 'Templates',
        icon: 'albums',
        color: '#8B5CF6',
        bg: '#F3EEFF',
        open: push('/receipt-templates'),
      },
    ],
    [lowStock, labPipeline, scansToday, oNeg, freeAmbulances, bedSummary, reorder]
  );

  // Operations & Clinical shortcuts
  const operationsModules: Tile[] = useMemo(
    () => [
      {
        id: 'queue',
        title: 'Token Queue',
        icon: 'ticket',
        color: '#1E6BFF',
        bg: '#E8F1FF',
        open: push('/queue'),
      },
      {
        id: 'opd',
        title: 'OPD Consult',
        icon: 'medical',
        color: '#10B981',
        bg: '#E7F8F1',
        open: push('/opd-consultation'),
      },
      {
        id: 'ipd',
        title: 'IPD Admit',
        icon: 'enter',
        color: '#8B5CF6',
        bg: '#F3EEFF',
        open: push('/ipd-admission'),
      },
      {
        id: 'discharge',
        title: 'Discharge',
        icon: 'document-text',
        color: '#14B8A6',
        bg: '#E6F7F5',
        open: push('/discharge-summary'),
      },
      {
        id: 'finance',
        title: 'Finance',
        icon: 'trending-up',
        color: '#059669',
        bg: '#E7F8F1',
        open: push('/financial-management'),
        badge: badge(true, `${formatCompactCurrency(todayStats.todayCollection)}`, 'success'),
      },
    ],
    [todayStats]
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header title="More Features" subtitle="Hospital services & modules" showBack={false} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Who is signed in */}
        <FadeInView style={styles.account}>
          <Avatar name={live ? actorName : 'Offline demo'} size={46} />
          <View style={{ flex: 1 }}>
            <Text style={styles.accountName} numberOfLines={1}>
              {live ? actorName : 'Offline demo'}
            </Text>
            <Text style={styles.accountMeta} numberOfLines={1}>
              {live ? [ROLE_LABEL[activeRole], user?.email].filter(Boolean).join(' • ') : 'Sample hospital on this device • nothing is saved'}
            </Text>
          </View>
          <Pressable
            onPress={confirmSignOut}
            style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={live ? 'Sign out' : 'Leave the offline demo'}
          >
            <Ionicons name="log-out-outline" size={17} color={colors.danger} />
            <Text style={styles.signOutText}>{live ? 'Sign out' : 'Exit'}</Text>
          </Pressable>
        </FadeInView>

        {/* Core Hospital Modules Grid */}
        <FadeInView delay={stagger(1, 80)}>
          <SectionHeader title="Hospital Services" meta={live ? 'Preview = sample data' : 'All features accessible'} />
          <View style={styles.gridCard}>
            {mainModules.map((tile) => (
              <ModuleTile
                key={tile.id}
                title={tile.title}
                icon={tile.icon}
                color={tile.color}
                bg={tile.bg}
                badge={tileBadge(tile)}
                onPress={tile.open}
              />
            ))}
          </View>
        </FadeInView>

        {/* Clinical & Operations Grid */}
        <FadeInView delay={stagger(2, 80)}>
          <SectionHeader title="Clinical & Administration" />
          <View style={styles.gridCard}>
            {operationsModules.map((tile) => (
              <ModuleTile
                key={tile.id}
                title={tile.title}
                icon={tile.icon}
                color={tile.color}
                bg={tile.bg}
                badge={tileBadge(tile)}
                onPress={tile.open}
              />
            ))}
          </View>
        </FadeInView>

        <Text style={styles.footnote}>
          {live ? `Connected to ${hospitalProfile.name} • Preview modules use sample data` : 'CareSync Hospital Suite • Offline demo on sample data'}
        </Text>
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl + 20,
  },
  gridCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  accountName: { fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.bold, color: colors.text },
  accountMeta: { fontSize: typography.fontSizes.xs + 1, color: colors.textSecondary, marginTop: 2 },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.dangerLight,
  },
  signOutText: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semiBold, color: colors.danger },
  footnote: {
    marginTop: spacing.xl,
    textAlign: 'center',
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
});
