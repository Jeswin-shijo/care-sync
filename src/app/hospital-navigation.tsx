import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import type { HospitalLocation } from '../data/mockData';
import { HOSPITAL_LOCATIONS } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { EmptyState } from '../components/common/EmptyState';
import { SearchBar } from '../components/common/SearchBar';
import { SectionHeader } from '../components/common/SectionHeader';
import { KeyboardAwareContainer, formScrollProps } from '../components/common/KeyboardAware';
import { FadeInView, PressableScale, stagger } from '../components/common/Motion';
import { CardAction } from '../components/portals/CardAction';
import { FloorMap, iconFor } from '../components/portals/FloorMap';

const QUICK_PICKS = ['loc-6', 'loc-5', 'loc-3', 'loc-1'];

/** Turn-by-turn steps: entrance → the location's own directions → arrival. */
const stepsFor = (loc: HospitalLocation): string[] => {
  const viaEmergency = loc.block === 'Emergency Block';
  const start = viaEmergency
    ? 'Use the east gate — the Emergency entrance is separate from the main lobby.'
    : 'Start at the main gate (Main Block, Ground Floor).';
  const middle = loc.directions
    .split(/;\s*|\.\s+/)
    .map((s) => s.trim().replace(/\.$/, ''))
    .filter(Boolean)
    .map((s) => `${s.charAt(0).toUpperCase()}${s.slice(1)}.`);
  return [start, ...middle, `You have arrived at ${loc.name}.`];
};

export default function HospitalNavigationRoute() {
  const params = useLocalSearchParams<{ focus?: string | string[] }>();
  const focus = Array.isArray(params.focus) ? params.focus[0] : params.focus;
  const { sendPatientAiMessage, hospitalProfile } = useApp();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const initial = HOSPITAL_LOCATIONS.find((l) => l.id === focus) ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(initial?.id ?? null);
  const [query, setQuery] = useState('');

  // A new `focus` param (e.g. from the assistant's "Directions" card) re-targets the map.
  useEffect(() => {
    if (initial) setSelectedId(initial.id);
  }, [focus]);

  const selected = HOSPITAL_LOCATIONS.find((l) => l.id === selectedId) ?? null;
  const unknownFocus = !!focus && !initial;
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return HOSPITAL_LOCATIONS;
    return HOSPITAL_LOCATIONS.filter((l) => `${l.name} ${l.block} ${l.floor}`.toLowerCase().includes(q));
  }, [query]);
  const steps = selected ? stepsFor(selected) : [];

  const select = (id: string, scroll = false) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedId(id);
    if (scroll) scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const shareDirections = () => {
    if (!selected) return;
    Share.share({
      message: `${selected.name} — ${selected.floor}, ${selected.block}, ${hospitalProfile.name}\n\n${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nAbout ${selected.walkMinutes} min walk from the entrance.`,
    }).catch(() => {});
  };

  const askAssistant = () => {
    sendPatientAiMessage(selected ? `Where is the ${selected.name}?` : 'How do I find my way around the hospital?');
    router.push('/patient-assistant');
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header title="Hospital Navigation" subtitle={hospitalProfile.name} />
      <KeyboardAwareContainer>
        <ScrollView
          ref={scrollRef}
          {...formScrollProps}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxl }]}
        >
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search OPD, lab, pharmacy, radiology…" />
          {unknownFocus && (
            <View style={styles.warn}>
              <Ionicons name="alert-circle-outline" size={15} color={colors.warningText} />
              <Text style={styles.warnText}>That location isn't on the map. Choose a destination below.</Text>
            </View>
          )}

          <FadeInView>
            <View style={styles.mapCard}>
              <View style={styles.mapHead}>
                <Text style={styles.mapTitle}>Campus map</Text>
                <Text style={styles.mapMeta}>Tap a pin to get directions</Text>
              </View>
              <FloorMap locations={HOSPITAL_LOCATIONS} selectedId={selectedId} onSelect={(id) => select(id)} />
            </View>
          </FadeInView>

          {selected ? (
            <FadeInView key={selected.id} offset={10}>
              <View style={styles.dest}>
                <View style={styles.destTop}>
                  <View style={styles.destIcon}>
                    <Ionicons name={iconFor(selected)} size={20} color={colors.primary} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.destName}>{selected.name}</Text>
                    <View style={styles.tags}>
                      <View style={styles.tag}>
                        <Ionicons name="business-outline" size={11} color={colors.textSecondary} />
                        <Text style={styles.tagText}>{selected.block}</Text>
                      </View>
                      <View style={styles.tag}>
                        <Ionicons name="layers-outline" size={11} color={colors.textSecondary} />
                        <Text style={styles.tagText}>{selected.floor}</Text>
                      </View>
                      <View style={[styles.tag, styles.tagWalk]}>
                        <Ionicons name="walk-outline" size={11} color={colors.successText} />
                        <Text style={[styles.tagText, { color: colors.successText }]}>~{selected.walkMinutes} min walk</Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View style={styles.steps}>
                  {steps.map((s, i) => (
                    <View key={`${selected.id}-${i}`} style={styles.step}>
                      <View style={styles.stepRail}>
                        <View style={[styles.stepDot, i === 0 && styles.stepStart, i === steps.length - 1 && styles.stepEnd]}>
                          {i === steps.length - 1 ? (
                            <Ionicons name="flag" size={10} color="#FFFFFF" />
                          ) : (
                            <Text style={[styles.stepNum, i === 0 && { color: '#FFFFFF' }]}>{i + 1}</Text>
                          )}
                        </View>
                        {i < steps.length - 1 && <View style={styles.stepLine} />}
                      </View>
                      <Text style={[styles.stepText, i === steps.length - 1 && styles.stepTextEnd]}>{s}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.destActions}>
                  <CardAction label="Share directions" icon="share-social-outline" variant="outline" onPress={shareDirections} grow />
                  <CardAction label="Ask assistant" icon="sparkles-outline" variant="primary" onPress={askAssistant} grow />
                </View>
              </View>
            </FadeInView>
          ) : (
            <View style={styles.hint}>
              <Ionicons name="navigate-circle-outline" size={22} color={colors.primary} />
              <View style={styles.flex}>
                <Text style={styles.hintTitle}>Where do you need to go?</Text>
                <Text style={styles.hintText}>Pick a destination on the map or from the list for step-by-step directions.</Text>
                <View style={styles.quickRow}>
                  {QUICK_PICKS.map((id) => HOSPITAL_LOCATIONS.find((l) => l.id === id))
                    .filter((l): l is HospitalLocation => !!l)
                    .map((l) => (
                      <PressableScale key={l.id} style={styles.quick} onPress={() => select(l.id)} accessibilityRole="button" accessibilityLabel={`Directions to ${l.name}`}>
                        <Ionicons name={iconFor(l)} size={13} color={l.block === 'Emergency Block' ? colors.danger : colors.primary} />
                        <Text style={styles.quickText} numberOfLines={1}>
                          {l.name.split(/[(&]/)[0].trim()}
                        </Text>
                      </PressableScale>
                    ))}
                </View>
              </View>
            </View>
          )}

          <SectionHeader title={query ? 'Search results' : 'All locations'} meta={`${results.length}`} />
          {results.map((l, i) => {
            const on = l.id === selectedId;
            return (
              <FadeInView key={l.id} delay={stagger(i, 40)}>
                <PressableScale
                  style={[styles.row, on && styles.rowOn]}
                  onPress={() => select(l.id, true)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${l.name}, ${l.floor}, ${l.block}, ${l.walkMinutes} minute walk`}
                >
                  <View style={[styles.rowIcon, l.block === 'Emergency Block' && { backgroundColor: colors.dangerLight }]}>
                    <Ionicons name={iconFor(l)} size={17} color={l.block === 'Emergency Block' ? colors.danger : colors.primary} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {l.name}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {l.floor} • {l.block}
                    </Text>
                  </View>
                  <Text style={styles.rowWalk}>{l.walkMinutes} min</Text>
                  <Ionicons name={on ? 'checkmark-circle' : 'chevron-forward'} size={18} color={on ? colors.primary : colors.textMuted} />
                </PressableScale>
              </FadeInView>
            );
          })}
          {!results.length && (
            <EmptyState
              icon="search-outline"
              title={`No match for "${query.trim()}"`}
              description="Try a department (cardiology), a service (pharmacy) or a floor."
              actionTitle="Clear search"
              onActionPress={() => setQuery('')}
              style={styles.empty}
            />
          )}
        </ScrollView>
      </KeyboardAwareContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
  },
  flex: { flex: 1 },
  warn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.warningLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  warnText: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 1,
    color: colors.warningText,
  },
  mapCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadows.sm,
  },
  mapHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  mapTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  mapMeta: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  dest: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary + '44',
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadows.sm,
  },
  destTop: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  destIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destName: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.cardMuted,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagWalk: {
    backgroundColor: colors.successLight,
  },
  tagText: {
    fontSize: 10.5,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.semiBold,
  },
  steps: {
    marginTop: spacing.md,
  },
  step: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stepRail: {
    alignItems: 'center',
    width: 22,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepStart: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  stepEnd: {
    backgroundColor: colors.primary,
  },
  stepNum: {
    fontSize: 10.5,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  stepLine: {
    flex: 1,
    width: 2,
    minHeight: 12,
    backgroundColor: colors.primary + '33',
    marginVertical: 2,
  },
  stepText: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    color: colors.text,
    lineHeight: 19,
    paddingBottom: spacing.md,
    paddingTop: 1,
  },
  stepTextEnd: {
    fontWeight: typography.fontWeights.bold,
    color: colors.primaryDark,
    paddingBottom: 0,
  },
  destActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  hint: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  hintTitle: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.primaryDark,
  },
  hintText: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.infoText,
    marginTop: 2,
    lineHeight: 16,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  quick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    minHeight: 36,
    maxWidth: 200,
  },
  quickText: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.text,
    fontWeight: typography.fontWeights.semiBold,
    flexShrink: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.sm,
    minHeight: 60,
    ...shadows.sm,
  },
  rowOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowName: {
    fontSize: typography.fontSizes.sm + 0.5,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  rowMeta: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  rowWalk: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.semiBold,
  },
  empty: {
    paddingVertical: spacing.lg,
  },
});
