import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Appointment } from '../../data/mockData';
import { HOSPITAL_LOCATIONS } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import { formatDisplayDate, relativeDayLabel } from '../../utils/dates';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { BottomSheet } from '../common/BottomSheet';
import { Button } from '../common/Button';
import { Avatar } from '../common/Avatar';
import { Badge, statusVariant } from '../common/Badge';

/** The department's own wayfinding point, if the hospital map has one. */
export const departmentLocation = (department: string) =>
  HOSPITAL_LOCATIONS.find((l) => l.name.toLowerCase().includes(department.toLowerCase()));

/** Wayfinding destination for a department's OPD (falls back to the registration desk). */
export const locationForDepartment = (department: string) => departmentLocation(department) ?? HOSPITAL_LOCATIONS[0];

const ORDINAL: Record<string, string> = { '1': '1st Floor', '2': '2nd Floor', '3': '3rd Floor', '4': '4th Floor' };
/** "Room 104" → "1st Floor" (OPD rooms are numbered by floor in the Main Block). */
const floorFromRoom = (room?: string) => {
  const m = /Room (\d)\d\d/i.exec(room ?? '');
  return m ? ORDINAL[m[1]] ?? null : null;
};

interface VisitDetailSheetProps {
  visible: boolean;
  appointment: Appointment | null;
  onClose: () => void;
}

/** Appointment details for the patient, with directions to the clinic. */
export const VisitDetailSheet: React.FC<VisitDetailSheetProps> = ({ visible, appointment, onClose }) => {
  const { doctors } = useApp();
  const a = appointment;
  const doctor = a ? doctors.find((d) => d.id === a.doctorId) : undefined;
  const own = a ? departmentLocation(a.department) : undefined;
  const loc = a ? own ?? locationForDepartment(a.department) : undefined;
  const roomFloor = floorFromRoom(doctor?.room);
  const where = !a
    ? ''
    : own
      ? `${doctor?.room ?? own.name} • ${own.floor}, ${own.block}`
      : doctor?.room
        ? `${doctor.room}${roomFloor ? ` • ${roomFloor}, Main Block` : ''} — check in at OPD Registration`
        : `${a.department} OPD — check in at OPD Registration`;

  const rows: Array<{ icon: keyof typeof Ionicons.glyphMap; label: string; value: string }> = a
    ? [
        { icon: 'calendar-outline', label: 'Date & time', value: `${relativeDayLabel(a.date)} • ${a.time} (${formatDisplayDate(a.date)})` },
        { icon: 'ticket-outline', label: 'Token', value: `#${a.tokenNo}` },
        { icon: 'medkit-outline', label: 'Visit type', value: a.type === 'Follow Up' ? 'Follow-up visit' : a.type },
        ...(a.reason ? [{ icon: 'document-text-outline' as const, label: 'Reason', value: a.reason }] : []),
        { icon: 'location-outline', label: 'Where', value: where },
      ]
    : [];

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Appointment details"
      subtitle={a ? a.department : undefined}
      footer={
        loc ? (
          <Button
            title={own ? 'Directions' : 'Directions to OPD Registration'}
            onPress={() => {
              onClose();
              router.push({ pathname: '/hospital-navigation', params: { focus: loc.id } });
            }}
            fullWidth
            icon={<Ionicons name="navigate" size={17} color="#FFFFFF" />}
          />
        ) : undefined
      }
    >
      {a && (
        <>
          <View style={styles.doctor}>
            <Avatar name={a.doctorName} size={48} />
            <View style={styles.flex}>
              <Text style={styles.doctorName}>{a.doctorName}</Text>
              <Text style={styles.doctorMeta}>
                {doctor?.specialty ?? a.department}
                {doctor?.qualification ? ` • ${doctor.qualification}` : ''}
              </Text>
            </View>
            <Badge label={a.status} variant={statusVariant(a.status)} size="sm" />
          </View>
          {rows.map((r) => (
            <View key={r.label} style={styles.row}>
              <View style={styles.rowIcon}>
                <Ionicons name={r.icon} size={16} color={colors.primary} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.rowLabel}>{r.label}</Text>
                <Text style={styles.rowValue}>{r.value}</Text>
              </View>
            </View>
          ))}
          <View style={styles.tip}>
            <Ionicons name="information-circle-outline" size={16} color={colors.infoText} />
            <Text style={styles.tipText}>Please arrive 15 minutes early and show your token at the {a.department} desk.</Text>
          </View>
        </>
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  doctor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: spacing.xs,
  },
  doctorName: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  doctorMeta: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.semiBold,
  },
  rowValue: {
    fontSize: typography.fontSizes.sm + 1,
    color: colors.text,
    fontWeight: typography.fontWeights.medium,
    marginTop: 1,
  },
  tip: {
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.infoLight,
  },
  tipText: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 1,
    color: colors.infoText,
    lineHeight: 17,
  },
});
