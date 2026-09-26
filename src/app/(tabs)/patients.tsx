import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, ListRenderItem, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Patient } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { SearchBar } from '../../components/common/SearchBar';
import { Avatar } from '../../components/common/Avatar';
import { Badge, statusVariant } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { FadeInView, PressableScale, stagger } from '../../components/common/Motion';
import { formScrollProps, KeyboardAwareContainer, useKeyboardHeight } from '../../components/common/KeyboardAware';
import { ChoiceChips } from '../../components/clinical/ChoiceChips';
import { digitsOnly, friendlyDate, stayDay } from '../../components/clinical/format';

type StatusFilter = 'All' | Patient['status'];
const FILTERS: StatusFilter[] = ['All', 'Active', 'Admitted', 'Discharged'];

const openRegister = () => router.push('/register-patient');

export default function PatientsRoute() {
  const { patients, clinicalProfiles, setSelectedPatientId } = useApp();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('All');
  const keyboardOpen = useKeyboardHeight() > 0;

  const allergic = useMemo(
    () => new Set(clinicalProfiles.filter((c) => c.allergies.length > 0).map((c) => c.patientId)),
    [clinicalProfiles]
  );

  // Search first, then count per status so the chips always add up to what is visible.
  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    // Only a numeric query is treated as a phone number (so "CC2025…" doesn't match phones).
    const qDigits = /[a-z]/i.test(query) ? '' : digitsOnly(query);
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.uhid.toLowerCase().includes(q) ||
        // Phones are stored as "+91 98765 43210" — compare digits only.
        (qDigits.length >= 3 && digitsOnly(p.phone).includes(qDigits))
    );
  }, [patients, query]);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { All: searched.length, Active: 0, Admitted: 0, Discharged: 0 };
    searched.forEach((p) => {
      c[p.status] += 1;
    });
    return c;
  }, [searched]);

  const visible = useMemo(() => (filter === 'All' ? searched : searched.filter((p) => p.status === filter)), [searched, filter]);

  const admittedTotal = patients.filter((p) => p.status === 'Admitted').length;

  const openPatient = useCallback(
    (p: Patient) => {
      setSelectedPatientId(p.id);
      router.push({ pathname: '/patient/[id]', params: { id: p.id } });
    },
    [setSelectedPatientId]
  );

  const renderItem: ListRenderItem<Patient> = ({ item: p, index }) => {
    const day = p.status === 'Admitted' ? stayDay(p.admittedOn) : null;
    return (
      <FadeInView delay={index < 12 ? stagger(index, 45) : 0} offset={12}>
        <PressableScale
          style={styles.card}
          onPress={() => openPatient(p)}
          accessibilityRole="button"
          accessibilityLabel={`${p.name}, ${p.uhid}, ${p.age} years ${p.gender}, ${p.status}${p.room ? `, ${p.room}` : ''}`}
        >
          <Avatar name={p.name} size={48} />
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {p.name}
              </Text>
              {allergic.has(p.id) && (
                <View style={styles.allergyTag} accessibilityLabel="Has drug allergy">
                  <Ionicons name="warning" size={10} color={colors.danger} />
                  <Text style={styles.allergyTagText}>Allergy</Text>
                </View>
              )}
            </View>
            <Text style={styles.uhid} numberOfLines={1}>
              UHID: {p.uhid}
            </Text>
            <Text style={styles.demo} numberOfLines={1}>
              {p.age} years • {p.gender} • {p.phone}
            </Text>
            {p.status === 'Admitted' && p.room ? (
              <View style={styles.roomRow}>
                <Ionicons name="bed-outline" size={12} color={colors.purple} />
                <Text style={styles.roomText} numberOfLines={1}>
                  {p.room}
                  {day ? ` • Day ${day}` : ''}
                  {p.attendingDoctor ? ` • ${p.attendingDoctor}` : ''}
                </Text>
              </View>
            ) : p.status === 'Discharged' && p.dischargedOn ? (
              <Text style={styles.demo} numberOfLines={1}>
                Discharged {friendlyDate(p.dischargedOn)}
              </Text>
            ) : null}
          </View>
          <View style={styles.right}>
            <Badge label={p.status} variant={statusVariant(p.status)} size="sm" />
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
        </PressableScale>
      </FadeInView>
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header
        title="Patients"
        subtitle={`${patients.length} registered • ${admittedTotal} admitted`}
        showBack={false}
        rightAction={
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={openRegister}
            activeOpacity={0.7}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Register new patient"
          >
            <Ionicons name="person-add" size={18} color={colors.primary} />
          </TouchableOpacity>
        }
      />
      <KeyboardAwareContainer>
        <View style={styles.searchSection}>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search name, UHID or phone…" />
        </View>
        <ChoiceChips
          scroll
          scrollInset={spacing.base}
          style={styles.filters}
          options={FILTERS.map((f) => ({ value: f, label: f, count: counts[f] }))}
          value={filter}
          onChange={setFilter}
        />
        <FlatList
          data={visible}
          keyExtractor={(p) => p.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, !visible.length && { flexGrow: 1 }]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          {...formScrollProps}
          ListEmptyComponent={
            query.trim() ? (
              <EmptyState
                icon="search-outline"
                title="No matching patients"
                description={`Nobody ${filter === 'All' ? '' : `${filter.toLowerCase()} `}matches “${query.trim()}”. Check the spelling, UHID or mobile number.`}
                actionTitle="Register New Patient"
                onActionPress={openRegister}
              />
            ) : (
              <EmptyState
                icon="people-outline"
                title={`No ${filter === 'All' ? '' : `${filter.toLowerCase()} `}patients`}
                description={filter === 'Admitted' ? 'No patient is currently admitted.' : 'Patients you register will appear here.'}
                actionTitle={filter === 'All' ? 'Register New Patient' : 'Show All Patients'}
                onActionPress={filter === 'All' ? openRegister : () => setFilter('All')}
              />
            )
          }
        />
        {!keyboardOpen && (
          <PressableScale
            style={styles.fab}
            onPress={openRegister}
            haptic
            accessibilityRole="button"
            accessibilityLabel="Register new patient"
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </PressableScale>
        )}
      </KeyboardAwareContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSection: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  filters: {
    marginBottom: spacing.sm,
    paddingVertical: 2,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
    paddingBottom: 110,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.md,
    marginBottom: spacing.sm + 2,
    ...shadows.sm,
  },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: {
    flexShrink: 1,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  allergyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.dangerLight,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  allergyTagText: { fontSize: 10, fontWeight: typography.fontWeights.bold, color: colors.danger },
  uhid: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: typography.fontWeights.medium,
  },
  demo: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  roomRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  roomText: {
    flex: 1,
    fontSize: typography.fontSizes.xs,
    color: colors.purple,
    fontWeight: typography.fontWeights.semiBold,
  },
  right: { alignItems: 'flex-end', gap: spacing.sm },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
});
