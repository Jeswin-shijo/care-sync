import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '../../../context/AppContext';
import { canAccess, ROLE_LABEL } from '../../../logic/access';
import { colors, radius, shadows, spacing, typography } from '../../../constants/theme';
import { FadeInView, PressableScale, ProgressFill, stagger } from '../../common/Motion';
import { SectionHeader } from '../../common/SectionHeader';
import { ROLES_CONFIG } from '../../common/RoleSwitcher';
import { formatDisplayDate } from '../../../utils/dates';
import { AuditTrailList } from '../AuditTrailList';
import { Expandable } from '../Expandable';
import { ALL_MODULES, MODULE_LABEL } from '../modules';
import { useNow } from '../time';
import { SectionScroll } from './common';

const CONTROLS: Array<{ icon: keyof typeof Ionicons.glyphMap; title: string; text: string }> = [
  { icon: 'lock-closed', title: 'Encryption in transit & at rest', text: 'TLS 1.3 on every API call; AES-256 for stored patient records and documents.' },
  { icon: 'document-lock', title: 'DPDP Act 2023 ready', text: 'Consent before processing, purpose limitation, and data-principal rights to access, correct and erase.' },
  { icon: 'medkit', title: 'HIPAA-ready controls', text: 'Minimum-necessary access, audit controls and a breach-notification workflow.' },
  { icon: 'key', title: 'API key security', text: 'Scoped keys, rotation and rate limiting at the API gateway.' },
  { icon: 'pulse', title: 'Monitoring & alerts', text: '24×7 monitoring with alerts for unusual access patterns.' },
  { icon: 'server', title: 'Backups & disaster recovery', text: 'Encrypted daily backups with quarterly restore drills.' },
];

export const SecuritySection: React.FC = () => {
  const { auditLog, activeRole, documents, getPatient } = useApp();
  const now = useNow(30000);
  const [openRole, setOpenRole] = useState<string | null>(activeRole);
  const consents = documents.filter((d) => d.type === 'Consent');

  return (
    <SectionScroll>
      <FadeInView>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.heroBody}>
            <Text style={styles.heroTitle}>Security & Compliance</Text>
            <Text style={styles.heroText}>
              RBAC for {ROLES_CONFIG.length} roles • {auditLog.length} audit entries • {consents.length} consent record{consents.length === 1 ? '' : 's'}
            </Text>
          </View>
        </View>
        <Text style={styles.demoNote}>Demo environment — controls below describe the production setup; data here is mock.</Text>
      </FadeInView>

      {/* RBAC summary */}
      <FadeInView delay={60}>
        <SectionHeader title="Role-based access" meta={`${ALL_MODULES.length} modules`} />
        {ROLES_CONFIG.map((r) => {
          const allowed = ALL_MODULES.filter((m) => canAccess(r.id, m));
          const expanded = openRole === r.id;
          const current = r.id === activeRole;
          return (
            <Expandable
              key={r.id}
              expanded={expanded}
              onToggle={() => setOpenRole(expanded ? null : r.id)}
              accessibilityLabel={`${ROLE_LABEL[r.id]}${current ? ', current role' : ''}: ${allowed.length} of ${ALL_MODULES.length} modules`}
              header={
                <View style={styles.roleRow}>
                  <View style={[styles.roleIcon, { backgroundColor: r.bg }]}>
                    <Ionicons name={r.icon} size={16} color={r.color} />
                  </View>
                  <View style={styles.roleBody}>
                    <Text style={styles.roleName}>
                      {ROLE_LABEL[r.id]}
                      {current ? <Text style={[styles.current, { color: r.color }]}>  • Signed in</Text> : null}
                    </Text>
                    <View style={styles.roleBarRow}>
                      <ProgressFill progress={allowed.length / ALL_MODULES.length} color={r.color} height={5} style={styles.roleBar} />
                      <Text style={styles.roleCount}>
                        {allowed.length}/{ALL_MODULES.length}
                      </Text>
                    </View>
                  </View>
                </View>
              }
            >
              <View style={styles.moduleChips}>
                {allowed.map((m) => (
                  <View key={m} style={[styles.moduleChip, { backgroundColor: r.bg }]}>
                    <Text style={[styles.moduleChipText, { color: r.color }]}>{MODULE_LABEL[m]}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.portal}>Home portal: {r.label}</Text>
            </Expandable>
          );
        })}
      </FadeInView>

      {/* Audit log */}
      <FadeInView delay={120}>
        <SectionHeader
          title="Audit log"
          meta={`${auditLog.length} entries`}
          actionLabel="Full trail"
          onActionPress={() => router.push('/admin-portal')}
        />
        <View style={styles.card}>
          <AuditTrailList entries={auditLog} now={now} limit={8} />
        </View>
      </FadeInView>

      {/* Data protection */}
      <FadeInView delay={180}>
        <SectionHeader title="Data protection" />
        <View style={styles.card}>
          {CONTROLS.map((c, i) => (
            <FadeInView key={c.title} delay={stagger(i, 40)}>
              <View style={[styles.controlRow, i > 0 && styles.divider]}>
                <View style={styles.controlIcon}>
                  <Ionicons name={c.icon} size={16} color="#047857" />
                </View>
                <View style={styles.controlBody}>
                  <Text style={styles.controlTitle}>{c.title}</Text>
                  <Text style={styles.controlText}>{c.text}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              </View>
            </FadeInView>
          ))}
        </View>
      </FadeInView>

      {/* Consent */}
      <FadeInView delay={240}>
        <SectionHeader title="Consent management" meta={`${consents.length} on file`} />
        <View style={styles.card}>
          <Text style={styles.consentText}>
            Signed consent forms are stored with the patient record. MediOS AI answers only from hospital records, and patients can opt
            out of AI-generated summaries at the front desk.
          </Text>
          {consents.length ? (
            consents.map((d) => (
              <PressableScale
                key={d.id}
                onPress={() => router.push({ pathname: '/documents', params: { patientId: d.patientId } })}
                scaleTo={0.98}
                style={styles.consentRow}
                accessibilityRole="button"
                accessibilityLabel={`${d.title} for ${d.patientName}, ${formatDisplayDate(d.date)}. Opens documents`}
              >
                <Ionicons name="document-text" size={18} color={colors.primary} />
                <View style={styles.controlBody}>
                  <Text style={styles.controlTitle} numberOfLines={1}>
                    {d.title}
                  </Text>
                  <Text style={styles.controlText}>
                    {getPatient(d.patientId)?.name ?? d.patientName} • {formatDisplayDate(d.date)} • {d.uploadedBy}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </PressableScale>
            ))
          ) : (
            <Text style={styles.empty}>No consent forms uploaded yet.</Text>
          )}
        </View>
      </FadeInView>
    </SectionScroll>
  );
};

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#ECFDF5',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBody: {
    flex: 1,
  },
  heroTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: '#065F46',
  },
  heroText: {
    fontSize: typography.fontSizes.xs + 1,
    color: '#047857',
    marginTop: 2,
  },
  demoNote: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  roleIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBody: {
    flex: 1,
    minWidth: 0,
  },
  roleName: {
    fontSize: typography.fontSizes.sm + 0.5,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  current: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  roleBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 6,
  },
  roleBar: {
    flex: 1,
  },
  roleCount: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
  },
  moduleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  moduleChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  moduleChipText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semiBold,
  },
  portal: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  controlIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBody: {
    flex: 1,
    minWidth: 0,
  },
  controlTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  controlText: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  consentText: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    lineHeight: 17,
    paddingVertical: spacing.sm,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  empty: {
    fontSize: typography.fontSizes.sm,
    color: colors.textMuted,
    paddingVertical: spacing.md,
  },
});
