import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BloodRequest, Patient } from '../../data/mockData';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { Badge, statusVariant } from '../common/Badge';
import { Button } from '../common/Button';
import { PulseDot } from '../common/Motion';
import { cardStyle } from './OpsUI';
import { plural } from './utils';

interface Props {
  request: BloodRequest;
  patient?: Patient;
  /** Units of this group + component currently in stock. */
  available: number;
  onIssue: () => void;
  onReject: () => void;
}

export const BloodRequestCard: React.FC<Props> = ({ request, patient, available, onIssue, onReject }) => {
  const pending = request.status === 'Pending Cross-match';
  const emergency = request.priority === 'Emergency';
  const enough = available >= request.units;

  return (
    <View style={[styles.card, emergency && pending && styles.cardEmergency]}>
      <View style={styles.top}>
        <View style={[styles.group, emergency && pending && styles.groupEmergency]}>
          <Text style={[styles.groupText, emergency && pending && { color: '#FFFFFF' }]}>{request.group}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.patient} numberOfLines={1}>
            {request.patientName}
          </Text>
          <Text style={styles.detail} numberOfLines={1}>
            {plural(request.units, 'unit')} • {request.component}
          </Text>
          {!!patient && (
            <Text style={styles.meta} numberOfLines={1}>
              {patient.room ? `${patient.room} • ` : ''}
              {patient.uhid}
            </Text>
          )}
        </View>
        <Badge label={request.status} variant={statusVariant(request.status)} size="sm" />
      </View>

      <View style={styles.metaRow}>
        {emergency ? (
          <View style={styles.priority}>
            {pending ? <PulseDot color={colors.danger} size={7} /> : <Ionicons name="flash" size={12} color={colors.danger} />}
            <Text style={styles.priorityEmergency}>Emergency</Text>
          </View>
        ) : (
          <View style={styles.priority}>
            <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
            <Text style={styles.priorityRoutine}>Routine</Text>
          </View>
        )}
        <Text style={styles.requested} numberOfLines={1}>
          {request.requestedBy} • {request.requestedAt}
        </Text>
      </View>

      {pending && (
        <View style={styles.footer}>
          <View style={styles.stockLine}>
            <Ionicons
              name={enough ? 'checkmark-circle' : 'alert-circle'}
              size={15}
              color={enough ? colors.success : colors.danger}
            />
            <Text style={[styles.stockText, { color: enough ? colors.successText : colors.danger }]} numberOfLines={2}>
              {enough
                ? `${plural(available, 'unit')} in stock`
                : `Short by ${plural(request.units - available, 'unit')} (${available} in stock)`}
            </Text>
          </View>
          <View style={styles.actions}>
            <Button
              title="Reject"
              variant="outline"
              size="sm"
              onPress={onReject}
              style={styles.rejectBtn}
              textStyle={styles.rejectText}
              icon={<Ionicons name="close-circle-outline" size={15} color={colors.danger} />}
            />
            <Button
              title="Issue"
              size="sm"
              onPress={onIssue}
              variant={emergency ? 'danger' : 'primary'}
              icon={<Ionicons name="checkmark-done" size={15} color="#FFFFFF" />}
              style={styles.issueBtn}
            />
          </View>
        </View>
      )}

      {request.status === 'Rejected' && (
        <View style={styles.rejection}>
          <Ionicons name="close-circle" size={15} color={colors.danger} />
          <Text style={styles.rejectionText}>
            <Text style={styles.rejectionLabel}>Rejected: </Text>
            {request.rejectionReason || 'No reason recorded'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    ...cardStyle,
    padding: spacing.md,
  },
  cardEmergency: {
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  group: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupEmergency: {
    backgroundColor: colors.danger,
  },
  groupText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.danger,
  },
  info: {
    flex: 1,
  },
  patient: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  detail: {
    fontSize: typography.fontSizes.sm,
    color: colors.text,
    marginTop: 2,
    fontWeight: typography.fontWeights.medium,
  },
  meta: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  priority: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.cardMuted,
  },
  priorityEmergency: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.danger,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  priorityRoutine: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
  },
  requested: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  footer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.md,
  },
  stockLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stockText: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.semiBold,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  rejectBtn: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderColor: colors.danger + '88',
  },
  rejectText: {
    color: colors.danger,
  },
  issueBtn: {
    minHeight: 40,
    paddingHorizontal: 18,
  },
  rejection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: spacing.md,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.dangerLight,
  },
  rejectionText: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 1,
    color: colors.dangerText,
    lineHeight: 17,
  },
  rejectionLabel: {
    fontWeight: typography.fontWeights.bold,
  },
});
