import React, { useMemo, useState } from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Patient } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { BottomSheet } from './BottomSheet';
import { SearchBar } from './SearchBar';
import { Avatar } from './Avatar';
import { Badge, statusVariant } from './Badge';
import { FilterTabs } from './FilterTabs';

const digits = (s: string) => s.replace(/\D/g, '');

interface PatientPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (patient: Patient) => void;
  title?: string;
  /** Restrict the list, e.g. only admitted patients. */
  filter?: (patient: Patient) => boolean;
  selectedId?: string | null;
  /** Show "Register new patient" (default true). */
  allowRegister?: boolean;
  /** Override the default (close + push /register-patient), e.g. when nested inside another sheet. */
  onRegister?: () => void;
}

/** Searchable patient chooser (name, UHID or phone). */
export const PatientPicker: React.FC<PatientPickerProps> = ({
  visible,
  onClose,
  onSelect,
  title = 'Select Patient',
  filter,
  selectedId,
  allowRegister = true,
  onRegister,
}) => {
  const { patients } = useApp();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('All');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qDigits = digits(query);
    return patients
      .filter((p) => (filter ? filter(p) : true))
      .filter((p) => tab === 'All' || p.status === tab)
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.uhid.toLowerCase().includes(q) ||
          (qDigits.length >= 3 && digits(p.phone).includes(qDigits))
      );
  }, [patients, query, tab, filter]);

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} subtitle={`${list.length} patient${list.length === 1 ? '' : 's'}`} maxHeight={0.88}>
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search name, UHID or phone…" />
      {!filter && (
        <FilterTabs tabs={['All', 'Active', 'Admitted', 'Discharged']} activeTab={tab} onSelectTab={setTab} style={{ marginTop: spacing.sm }} />
      )}
      <View style={{ marginTop: spacing.sm }}>
        {list.map((p) => {
          const selected = p.id === selectedId;
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.row, selected && styles.rowSelected]}
              activeOpacity={0.7}
              onPress={() => {
                onSelect(p);
                onClose();
              }}
              accessibilityRole="button"
              accessibilityLabel={`Select ${p.name}`}
            >
              <Avatar name={p.name} size={40} />
              <View style={styles.info}>
                <Text style={styles.name}>{p.name}</Text>
                <Text style={styles.meta}>
                  {p.uhid} • {p.age}y {p.gender[0]}
                  {p.room ? ` • ${p.room}` : ''}
                </Text>
              </View>
              {selected ? (
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              ) : (
                <Badge label={p.status} variant={statusVariant(p.status)} size="sm" />
              )}
            </TouchableOpacity>
          );
        })}
        {!list.length && <Text style={styles.empty}>No patients match "{query}".</Text>}
      </View>
      {allowRegister && (
        <TouchableOpacity
          style={styles.register}
          onPress={() => {
            onClose();
            if (onRegister) onRegister();
            else router.push('/register-patient');
          }}
        >
          <Ionicons name="person-add-outline" size={18} color={colors.primary} />
          <Text style={styles.registerText}>Register new patient</Text>
        </TouchableOpacity>
      )}
    </BottomSheet>
  );
};

interface PatientSelectorBarProps {
  patient?: Patient | null;
  onPress: () => void;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

/** Compact "Billing to: …  Change" bar that opens a PatientPicker. */
export const PatientSelectorBar: React.FC<PatientSelectorBarProps> = ({ patient, onPress, label = 'Patient', style }) => (
  <TouchableOpacity style={[styles.bar, !patient && styles.barEmpty, style]} onPress={onPress} activeOpacity={0.8} accessibilityRole="button">
    {patient ? (
      <Avatar name={patient.name} size={34} />
    ) : (
      <View style={styles.barIcon}>
        <Ionicons name="person-outline" size={18} color={colors.primary} />
      </View>
    )}
    <View style={styles.info}>
      <Text style={styles.barLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.barName, !patient && { color: colors.primary }]} numberOfLines={1}>
        {patient ? `${patient.name} • ${patient.uhid}` : 'Tap to select a patient'}
      </Text>
    </View>
    <Text style={styles.change}>{patient ? 'Change' : 'Select'}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowSelected: {
    backgroundColor: colors.primaryLight,
    borderBottomColor: 'transparent',
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.text,
  },
  meta: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    paddingVertical: spacing.xl,
  },
  register: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
  },
  registerText: {
    color: colors.primary,
    fontWeight: typography.fontWeights.semiBold,
    fontSize: typography.fontSizes.sm + 1,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
  },
  barEmpty: {
    borderColor: colors.primary + '55',
    borderStyle: 'dashed',
    backgroundColor: colors.primaryLight,
  },
  barIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  barLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  barName: {
    fontSize: typography.fontSizes.sm + 1,
    color: colors.text,
    fontWeight: typography.fontWeights.semiBold,
    marginTop: 1,
  },
  change: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
    fontSize: typography.fontSizes.sm,
  },
});
