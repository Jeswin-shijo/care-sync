import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { HospitalProtocol } from '../../../data/mockData';
import { colors, radius, spacing, typography } from '../../../constants/theme';
import { Badge } from '../../common/Badge';
import { Button } from '../../common/Button';
import { EmptyState } from '../../common/EmptyState';
import { FadeInView, stagger } from '../../common/Motion';
import { SearchBar } from '../../common/SearchBar';
import { PatientContext, protocolMatches } from '../copilotEngine';

interface ProtocolsPanelProps {
  ctx: PatientContext;
  relevantIds: string[];
  onAddToPlan: (protocol: HospitalProtocol) => void;
}

/** "Hospital Protocols": search the SOP library (RAG source) and cite a protocol in the plan. */
export const ProtocolsPanel: React.FC<ProtocolsPanelProps> = ({ ctx, relevantIds, onAddToPlan }) => {
  const first = ctx.patient.name.split(' ')[0];
  const forPatient = `For ${first}`;
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('All');
  const [open, setOpen] = useState<string | null>(null);

  const categories = useMemo(() => {
    const cats = [...new Set(ctx.protocols.map((p) => p.category))];
    return [...(relevantIds.length ? [forPatient] : []), 'All', ...cats];
  }, [ctx.protocols, relevantIds.length, forPatient]);

  const list = useMemo(() => {
    const filtered = ctx.protocols
      .filter((p) => (category === 'All' ? true : category === forPatient ? relevantIds.includes(p.id) : p.category === category))
      .filter((p) => protocolMatches(p, query));
    return query.trim() ? filtered : [...filtered].sort((a, b) => Number(relevantIds.includes(b.id)) - Number(relevantIds.includes(a.id)));
  }, [ctx.protocols, category, query, relevantIds, forPatient]);

  return (
    <View>
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search SOPs, e.g. sepsis, insulin, dengue…" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.cats} style={styles.catScroll}>
        {categories.map((c) => {
          const active = c === category;
          return (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={[styles.cat, active && styles.catActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              {c === forPatient && <Ionicons name="person" size={11} color={active ? '#FFFFFF' : colors.purple} />}
              <Text style={[styles.catText, active && styles.catTextActive]}>{c}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={styles.count}>
        Showing {list.length} of {ctx.protocols.length} hospital SOPs
      </Text>

      {!list.length && (
        <EmptyState
          icon="search-outline"
          title="No protocols match"
          description={query.trim() ? `Nothing in the SOP library matches “${query.trim()}”.` : 'No protocols in this category.'}
          actionTitle="Clear filters"
          onActionPress={() => {
            setQuery('');
            setCategory('All');
          }}
        />
      )}

      {list.map((p, i) => {
        const expanded = open === p.id;
        const relevant = relevantIds.includes(p.id);
        return (
          <FadeInView key={p.id} delay={stagger(i, 40)} offset={8}>
            <Pressable
              onPress={() => setOpen(expanded ? null : p.id)}
              style={[styles.card, relevant && styles.cardRelevant]}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLabel={`${p.title}. ${p.category}`}
            >
              <View style={styles.cardHead}>
                <View style={styles.bookIcon}>
                  <Ionicons name="book" size={15} color="#7C3AED" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{p.title}</Text>
                  <View style={styles.metaRow}>
                    <Badge label={p.category} variant="default" size="sm" />
                    {relevant && <Badge label={`Relevant for ${first}`} variant="admitted" size="sm" />}
                  </View>
                </View>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
              </View>
              <Text style={styles.desc}>{p.description}</Text>
              {expanded && (
                <View style={styles.stepsBox}>
                  {p.keySteps.map((step) => (
                    <Text key={step} style={styles.step}>
                      {step}
                    </Text>
                  ))}
                  <Button
                    title="Cite in today's plan"
                    size="sm"
                    variant="outline"
                    onPress={() => onAddToPlan(p)}
                    icon={<Ionicons name="add-circle-outline" size={15} color={colors.primary} />}
                    style={styles.cite}
                  />
                </View>
              )}
              <View style={styles.footer}>
                <View style={styles.sop}>
                  <Ionicons name="document-text-outline" size={10} color={colors.primaryDark} />
                  <Text style={styles.sopText}>SOP {p.id}</Text>
                </View>
                <Text style={styles.updated}>Updated {p.lastUpdated} • Clinical Governance</Text>
              </View>
            </Pressable>
          </FadeInView>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  catScroll: {
    flexGrow: 0,
    marginTop: spacing.sm,
  },
  cats: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  cat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  catActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  catText: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
  },
  catTextActive: {
    color: '#FFFFFF',
  },
  count: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: '#FFFFFF',
  },
  cardRelevant: {
    borderColor: '#DDD6FE',
    backgroundColor: '#FCFBFF',
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bookIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  desc: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    lineHeight: 17,
    marginTop: spacing.sm,
  },
  stepsBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.cardMuted,
    gap: 6,
  },
  step: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.text,
    lineHeight: 17,
  },
  cite: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  sop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  sopText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.primaryDark,
  },
  updated: {
    flex: 1,
    fontSize: 10,
    color: colors.textMuted,
  },
});
