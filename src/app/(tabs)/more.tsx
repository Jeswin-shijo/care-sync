import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '../../context/AppContext';
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
  } = useApp();

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
        {/* Core Hospital Modules Grid */}
        <FadeInView delay={stagger(1, 80)}>
          <SectionHeader title="Hospital Services" meta="All features accessible" />
          <View style={styles.gridCard}>
            {mainModules.map((tile) => (
              <ModuleTile
                key={tile.id}
                title={tile.title}
                icon={tile.icon}
                color={tile.color}
                bg={tile.bg}
                badge={tile.badge}
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
                badge={tile.badge}
                onPress={tile.open}
              />
            ))}
          </View>
        </FadeInView>

        <Text style={styles.footnote}>
          CareSync Hospital Suite • All departmental modules active
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
  footnote: {
    marginTop: spacing.xl,
    textAlign: 'center',
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
});
