import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../../context/AppContext';
import { useToast } from '../../../context/ToastContext';
import type { Branch } from '../../../data/mockData';
import { colors, radius, shadows, spacing, typography } from '../../../constants/theme';
import { Badge, statusVariant } from '../../common/Badge';
import { Button } from '../../common/Button';
import { EmptyState } from '../../common/EmptyState';
import { AnimatedNumber, FadeInView, stagger } from '../../common/Motion';
import { SectionScroll } from './common';

const TYPE_ICON: Record<Branch['type'], keyof typeof Ionicons.glyphMap> = {
  'Main Hospital': 'business',
  'Satellite Hospital': 'medkit',
  Clinic: 'storefront',
};

export const BranchesSection: React.FC = () => {
  const { branches } = useApp();
  const { showToast } = useToast();

  const open = (url: string, fallback: string) => {
    Linking.openURL(url).catch(() => showToast({ type: 'warning', message: fallback }));
  };

  if (!branches.length) {
    return <EmptyState icon="location-outline" title="No branches" description="Hospital branches and clinics will appear here." />;
  }

  const operational = branches.filter((b) => b.status === 'Operational').length;
  const beds = branches.reduce((n, b) => n + b.beds, 0);

  return (
    <SectionScroll>
      <FadeInView>
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <AnimatedNumber value={branches.length} style={styles.summaryValue} />
            <Text style={styles.summaryLabel}>Locations</Text>
          </View>
          <View style={styles.summaryItem}>
            <AnimatedNumber value={operational} style={styles.summaryValue} />
            <Text style={styles.summaryLabel}>Operational</Text>
          </View>
          <View style={styles.summaryItem}>
            <AnimatedNumber value={beds} style={styles.summaryValue} />
            <Text style={styles.summaryLabel}>Total beds</Text>
          </View>
        </View>
      </FadeInView>

      {branches.map((b, i) => (
        <FadeInView key={b.id} delay={stagger(i + 1)}>
          <View style={styles.card}>
            <View style={styles.top}>
              <View style={[styles.icon, b.type === 'Main Hospital' && styles.iconHq]}>
                <Ionicons name={TYPE_ICON[b.type]} size={20} color={b.type === 'Main Hospital' ? '#FFFFFF' : colors.primary} />
              </View>
              <View style={styles.body}>
                <Text style={styles.name}>{b.name}</Text>
                <Text style={styles.type}>
                  {b.type}
                  {b.beds ? ` • ${b.beds} beds` : ' • Outpatient only'}
                  {i === 0 ? ' • Primary' : ''}
                </Text>
              </View>
              <Badge label={b.status} variant={statusVariant(b.status)} size="sm" />
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={14} color={colors.textMuted} />
              <Text style={styles.infoText}>{b.address}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={14} color={colors.textMuted} />
              <Text style={styles.infoText}>{b.phone}</Text>
            </View>
            <View style={styles.actions}>
              <Button
                title="Call"
                size="sm"
                variant="outline"
                icon={<Ionicons name="call" size={14} color={colors.primary} />}
                onPress={() => open(`tel:${b.phone.replace(/[^\d+]/g, '')}`, `Calling isn't available on this device. ${b.phone}`)}
                style={styles.actionBtn}
              />
              <Button
                title="Directions"
                size="sm"
                variant="outline"
                icon={<Ionicons name="navigate" size={14} color={colors.primary} />}
                onPress={() =>
                  open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${b.name}, ${b.address}`)}`, 'Could not open maps on this device.')
                }
                style={styles.actionBtn}
              />
            </View>
          </View>
        </FadeInView>
      ))}
    </SectionScroll>
  );
};

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: typography.fontSizes.lg + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  summaryLabel: {
    fontSize: 10.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconHq: {
    backgroundColor: colors.primary,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  type: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
  },
  infoText: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionBtn: {
    flex: 1,
  },
});
