import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PatientDocument } from '../../data/mockData';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { daysFromToday, formatDisplayDate, relativeDayLabel, todayISO } from '../../utils/dates';
import { PressableScale } from '../common/Motion';
import { DOC_TYPE_META } from './documents';
import { cardStyle } from './OpsUI';

interface Props {
  doc: PatientDocument;
  onPress: () => void;
  /** Show the patient's name (flat lists, search results). */
  showPatient?: boolean;
}

export const DocumentRow: React.FC<Props> = ({ doc, onPress, showPatient }) => {
  const meta = DOC_TYPE_META[doc.type];
  const isToday = doc.date === todayISO();
  const when = Math.abs(daysFromToday(doc.date)) < 7 ? relativeDayLabel(doc.date) : formatDisplayDate(doc.date);

  return (
    <PressableScale
      onPress={onPress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`${doc.title}, ${doc.type}, ${formatDisplayDate(doc.date)}${showPatient ? `, ${doc.patientName}` : ''}. Open preview`}
    >
      <View style={[styles.icon, { backgroundColor: meta.bg }]}>
        <Ionicons name={meta.icon} size={20} color={meta.color} />
      </View>
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {doc.title}
          </Text>
          {isToday && (
            <View style={styles.newPill}>
              <Text style={styles.newText}>New</Text>
            </View>
          )}
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          <Text style={{ color: meta.color, fontWeight: typography.fontWeights.semiBold }}>{doc.type}</Text> • {when} • {doc.size}
        </Text>
        <Text style={styles.by} numberOfLines={1}>
          {showPatient ? `${doc.patientName} • ` : ''}by {doc.uploadedBy}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  card: {
    ...cardStyle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minHeight: 68,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    flexShrink: 1,
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  newPill: {
    backgroundColor: colors.successLight,
    borderRadius: radius.xs,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  newText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.successText,
  },
  meta: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
  },
  by: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
});
