import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../constants/theme';

interface ReportTableProps {
  columns: string[];
  rows: string[][];
  alignRight?: number[];
  /** Horizontal space taken by the card around the table (gutters + padding). */
  inset?: number;
  emptyText?: string;
  pageSize?: number;
}

const CHAR_W = 6.4;
const CELL_PAD = 14;

const DANGER = /\b(abnormal|missed|out of stock|expired|reorder now|critical|declin\w*|rising|elevated\w*|overdue)/i;
const WARNING = /\b(pending|low stock|due today|not booked|expires|awaiting|queued|indent raised|processing|draft|scheduled)/i;
const GOOD = /^(paid|completed|ready|reported|final|active)$/i;

const toneOf = (cell: string) => (DANGER.test(cell) ? colors.danger : WARNING.test(cell) ? colors.warningText : GOOD.test(cell) ? colors.success : null);

/** Data table sized from its content; scrolls sideways when the columns can't fit the screen. */
export const ReportTable: React.FC<ReportTableProps> = ({
  columns,
  rows,
  alignRight = [],
  inset = spacing.base * 2 + spacing.md * 2,
  emptyText = 'No records for this report yet.',
  pageSize = 40,
}) => {
  const { width } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);
  const available = Math.max(200, width - inset);

  const natural = columns.map((c, i) => {
    const longest = rows.reduce((m, r) => Math.max(m, (r[i] ?? '').length), c.length);
    const min = i === 0 ? 104 : 58;
    const max = i === 0 ? 190 : 170;
    return Math.min(max, Math.max(min, Math.round(longest * CHAR_W + CELL_PAD)));
  });
  const total = natural.reduce((n, w) => n + w, 0);
  const fits = total <= available;
  const widths = fits ? natural.map((w) => (w / total) * available) : natural;
  const shown = expanded ? rows : rows.slice(0, pageSize);
  const right = (i: number) => alignRight.includes(i);

  if (!rows.length) {
    return (
      <View style={styles.empty}>
        <Ionicons name="file-tray-outline" size={22} color={colors.textMuted} />
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    );
  }

  const table = (
    <View>
      <View style={styles.headRow}>
        {columns.map((c, i) => (
          <Text key={`${c}-${i}`} style={[styles.th, { width: widths[i] }, right(i) && styles.right]} numberOfLines={2}>
            {c}
          </Text>
        ))}
      </View>
      {shown.map((r, ri) => (
        <View key={ri} style={[styles.row, ri % 2 === 1 && styles.rowAlt]}>
          {columns.map((_, ci) => {
            const cell = r[ci] ?? '';
            const tone = ci > 0 && !right(ci) ? toneOf(cell) : null;
            return (
              <Text
                key={ci}
                style={[styles.td, { width: widths[ci] }, right(ci) && styles.right, ci === 0 && styles.first, tone ? { color: tone, fontWeight: '700' } : null]}
                numberOfLines={3}
              >
                {cell}
              </Text>
            );
          })}
        </View>
      ))}
    </View>
  );

  return (
    <View>
      {fits ? (
        table
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled contentContainerStyle={styles.hScroll}>
            {table}
          </ScrollView>
          <View style={styles.hint}>
            <Ionicons name="swap-horizontal-outline" size={14} color={colors.textMuted} />
            <Text style={styles.hintText}>Swipe sideways to see all {columns.length} columns</Text>
          </View>
        </>
      )}
      {rows.length > pageSize && (
        <TouchableOpacity style={styles.more} onPress={() => setExpanded((v) => !v)} accessibilityRole="button">
          <Text style={styles.moreText}>{expanded ? 'Show fewer rows' : `Show all ${rows.length} rows`}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headRow: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
    paddingBottom: 6,
  },
  th: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    paddingHorizontal: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowAlt: {
    backgroundColor: colors.background,
  },
  td: {
    fontSize: 12,
    color: colors.text,
    paddingHorizontal: 5,
    lineHeight: 16,
  },
  first: {
    fontWeight: typography.fontWeights.semiBold,
  },
  right: {
    textAlign: 'right',
  },
  hScroll: {
    paddingRight: spacing.sm,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },
  hintText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  more: {
    alignSelf: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  moreText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  emptyText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
