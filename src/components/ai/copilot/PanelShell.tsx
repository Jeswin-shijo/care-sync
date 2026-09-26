import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, spacing, typography } from '../../../constants/theme';
import { FadeInView, Skeleton, TypingDots } from '../../common/Motion';

interface PanelShellProps {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  subtitle?: string;
  analyzing: boolean;
  analyzingLabel: string;
  children: React.ReactNode;
}

/** Card wrapper for a copilot tab: header, then a short "Analyzing…" skeleton while the record is (re)read. */
export const PanelShell: React.FC<PanelShellProps> = ({ icon, color, title, subtitle, analyzing, analyzingLabel, children }) => (
  <View style={styles.card}>
    <View style={styles.head}>
      <View style={[styles.icon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
      <View style={styles.aiTag}>
        <Ionicons name="sparkles" size={10} color={colors.primary} />
        <Text style={styles.aiTagText}>AI</Text>
      </View>
    </View>
    {analyzing ? (
      <View style={styles.skeleton} accessibilityLabel={analyzingLabel} accessibilityLiveRegion="polite">
        <View style={styles.analyzingRow}>
          <TypingDots color={colors.primary} />
          <Text style={styles.analyzingText}>{analyzingLabel}</Text>
        </View>
        <Skeleton height={13} width="94%" />
        <Skeleton height={13} width="82%" style={{ marginTop: 9 }} />
        <Skeleton height={13} width="88%" style={{ marginTop: 9 }} />
        <Skeleton height={56} radius={10} style={{ marginTop: 14 }} />
      </View>
    ) : (
      <FadeInView offset={8} duration={300}>
        {children}
      </FadeInView>
    )}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    ...shadows.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  aiTagText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.primary,
  },
  skeleton: {
    paddingVertical: spacing.xs,
  },
  analyzingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  analyzingText: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
});
