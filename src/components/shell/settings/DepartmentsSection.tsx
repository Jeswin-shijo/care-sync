import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '../../../context/AppContext';
import { colors, radius, shadows, spacing, typography } from '../../../constants/theme';
import { Avatar } from '../../common/Avatar';
import { Button } from '../../common/Button';
import { EmptyState } from '../../common/EmptyState';
import { AnimatedNumber, FadeInView, ProgressFill, stagger } from '../../common/Motion';
import { formatCurrency } from '../../../utils/formatters';
import { Expandable } from '../Expandable';
import { SectionScroll } from './common';

type IconName = keyof typeof Ionicons.glyphMap;

const isIcon = (name: string): name is IconName => name in Ionicons.glyphMap;

export const DepartmentsSection: React.FC = () => {
  const { departments, doctors } = useApp();
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      departments
        .map((d) => ({ ...d, doctors: doctors.filter((doc) => doc.department === d.name) }))
        .sort((a, b) => b.opdToday - a.opdToday),
    [departments, doctors]
  );
  const maxOpd = Math.max(1, ...rows.map((r) => r.opdToday));
  const totals = {
    opd: rows.reduce((n, r) => n + r.opdToday, 0),
    beds: rows.reduce((n, r) => n + r.beds, 0),
    doctors: rows.reduce((n, r) => n + r.doctors.length, 0),
  };

  if (!rows.length) {
    return <EmptyState icon="git-network-outline" title="No departments" description="Departments added for this hospital will appear here." />;
  }

  return (
    <SectionScroll>
      <FadeInView>
        <View style={styles.summary}>
          {[
            { label: 'Departments', value: rows.length },
            { label: 'OPD today', value: totals.opd },
            { label: 'Beds', value: totals.beds },
            { label: 'Doctors', value: totals.doctors },
          ].map((s) => (
            <View key={s.label} style={styles.summaryItem}>
              <AnimatedNumber value={s.value} style={styles.summaryValue} />
              <Text style={styles.summaryLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </FadeInView>

      {rows.map((d, i) => {
        const icon: IconName = isIcon(d.icon) ? d.icon : 'medkit';
        const expanded = open === d.id;
        return (
          <FadeInView key={d.id} delay={stagger(i + 1, 40)}>
            <Expandable
              expanded={expanded}
              onToggle={() => setOpen(expanded ? null : d.id)}
              accessibilityLabel={`${d.name}, head ${d.head}, ${d.doctors.length} doctors, ${d.opdToday} OPD today, ${d.beds} beds`}
              header={
                <View style={styles.headerRow}>
                  <View style={[styles.icon, { backgroundColor: `${d.color}1A` }]}>
                    <Ionicons name={icon} size={18} color={d.color} />
                  </View>
                  <View style={styles.headerBody}>
                    <Text style={styles.name} numberOfLines={1}>
                      {d.name}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      Head: {d.head}
                    </Text>
                    <View style={styles.loadRow}>
                      <ProgressFill progress={d.opdToday / maxOpd} color={d.color} height={5} delay={stagger(i, 50)} style={styles.loadBar} />
                      <Text style={styles.loadText}>
                        {d.opdToday} OPD • {d.beds} beds • {d.doctors.length} dr
                      </Text>
                    </View>
                  </View>
                </View>
              }
            >
              {d.doctors.length ? (
                d.doctors.map((doc) => (
                  <View key={doc.id} style={styles.doctorRow}>
                    <Avatar name={doc.name} size={36} />
                    <View style={styles.doctorBody}>
                      <Text style={styles.doctorName}>{doc.name}</Text>
                      <Text style={styles.doctorMeta}>
                        {doc.specialty} • {doc.room}
                      </Text>
                      <Text style={styles.doctorMeta}>
                        {doc.timing} • {formatCurrency(doc.fee)} • ★ {doc.rating.toFixed(1)}
                      </Text>
                    </View>
                    <Button
                      title="Book"
                      size="sm"
                      variant="outline"
                      onPress={() => router.push({ pathname: '/book-appointment', params: { doctorId: doc.id } })}
                    />
                  </View>
                ))
              ) : (
                <Text style={styles.noDoctors}>No consultants mapped yet — services run through the department head.</Text>
              )}
            </Expandable>
          </FadeInView>
        );
      })}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBody: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  meta: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    marginTop: 1,
  },
  loadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 6,
  },
  loadBar: {
    flex: 1,
  },
  loadText: {
    fontSize: 10.5,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.medium,
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  doctorBody: {
    flex: 1,
    minWidth: 0,
  },
  doctorName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  doctorMeta: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  noDoctors: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textMuted,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
});
