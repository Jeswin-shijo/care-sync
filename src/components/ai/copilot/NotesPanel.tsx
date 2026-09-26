import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ClinicalNote } from '../../../data/mockData';
import { colors, radius, spacing, typography } from '../../../constants/theme';
import { Badge } from '../../common/Badge';
import { Button } from '../../common/Button';
import { FadeInView, Skeleton } from '../../common/Motion';
import { relativeDayLabel } from '../../../utils/dates';
import { SoapEditor } from '../SoapEditor';
import { PatientContext, SoapNote, soapIsEmpty } from '../copilotEngine';

export interface DraftEntry {
  note: SoapNote;
  origin: ClinicalNote['source'];
  edited: boolean;
  /** Set once the note is approved & saved. */
  savedNoteId?: string;
  savedAt?: string;
}

const ORIGIN_LABEL: Record<ClinicalNote['source'], string> = {
  'AI Draft': 'AI draft',
  Voice: 'AI draft + voice',
  Text: 'Written by doctor',
};

interface NotesPanelProps {
  ctx: PatientContext;
  draft: DraftEntry;
  notes: ClinicalNote[];
  regenerating: boolean;
  pendingInsights: number;
  onChange: (key: keyof SoapNote, text: string) => void;
  onRegenerate: () => void;
  onClear: () => void;
  onVoice: () => void;
  onApprove: () => void;
  onNewDraft: () => void;
  onOpenInsights: () => void;
}

/** "Draft Notes": an editable SOAP draft per patient → doctor approval → EMR. */
export const NotesPanel: React.FC<NotesPanelProps> = ({
  ctx,
  draft,
  notes,
  regenerating,
  pendingInsights,
  onChange,
  onRegenerate,
  onClear,
  onVoice,
  onApprove,
  onNewDraft,
  onOpenInsights,
}) => {
  const [openNote, setOpenNote] = useState<string | null>(null);
  const empty = soapIsEmpty(draft.note);
  const saved = !!draft.savedNoteId;

  return (
    <View>
      {saved ? (
        <FadeInView style={styles.savedBox}>
          <Ionicons name="shield-checkmark" size={22} color={colors.success} />
          <View style={{ flex: 1 }}>
            <Text style={styles.savedTitle}>Note approved & saved to EMR</Text>
            <Text style={styles.savedSub}>
              {draft.savedAt} • {ctx.patient.name} • audit logged
            </Text>
          </View>
          <Button title="New draft" size="sm" variant="outline" onPress={onNewDraft} />
        </FadeInView>
      ) : (
        <>
          <View style={styles.banner}>
            <Ionicons name="sparkles" size={15} color={colors.warningText} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>AI draft — review before approving</Text>
              <Text style={styles.bannerSub}>
                Built from {ctx.visits.length} encounter{ctx.visits.length === 1 ? '' : 's'}, {ctx.vitals ? 'latest vitals' : 'no vitals'} and {ctx.labResults.length} lab result
                {ctx.labResults.length === 1 ? '' : 's'}. It restates the record only — new orders come from Clinical Insights.
              </Text>
            </View>
          </View>
          <View style={styles.originRow}>
            <Badge label={ORIGIN_LABEL[draft.origin]} variant={draft.origin === 'Text' ? 'default' : 'primary'} size="sm" />
            {draft.edited && <Badge label="Edited" variant="info" size="sm" />}
          </View>

          {regenerating ? (
            <View style={styles.regen} accessibilityLabel="Regenerating draft">
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={{ marginBottom: spacing.md }}>
                  <Skeleton height={12} width={90} />
                  <Skeleton height={54} radius={10} style={{ marginTop: 8 }} />
                </View>
              ))}
            </View>
          ) : (
            <SoapEditor value={draft.note} onChange={onChange} />
          )}

          <View style={styles.tools}>
            <Pressable onPress={onRegenerate} style={styles.tool} disabled={regenerating} accessibilityRole="button" accessibilityLabel="Regenerate AI draft">
              <Ionicons name="refresh" size={18} color={colors.primary} />
              <Text style={styles.toolText} numberOfLines={1}>
                Regenerate
              </Text>
            </Pressable>
            <Pressable onPress={onVoice} style={styles.tool} disabled={regenerating} accessibilityRole="button" accessibilityLabel="Voice to notes">
              <Ionicons name="mic-outline" size={18} color={colors.primary} />
              <Text style={styles.toolText} numberOfLines={1} adjustsFontSizeToFit>
                Voice-to-notes
              </Text>
            </Pressable>
            <Pressable onPress={onClear} style={styles.tool} disabled={regenerating || empty} accessibilityRole="button" accessibilityLabel="Clear and write from scratch">
              <Ionicons name="trash-outline" size={18} color={empty ? colors.textMuted : colors.danger} />
              <Text style={[styles.toolText, { color: empty ? colors.textMuted : colors.danger }]} numberOfLines={1}>
                Clear
              </Text>
            </Pressable>
          </View>

          {pendingInsights > 0 && (
            <Pressable onPress={onOpenInsights} style={styles.insightHint} accessibilityRole="button">
              <Ionicons name="bulb-outline" size={16} color={colors.purple} />
              <Text style={styles.insightHintText}>
                {pendingInsights} evidence-based suggestion{pendingInsights === 1 ? '' : 's'} in Clinical Insights — accepted ones are added to the Plan.
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.purple} />
            </Pressable>
          )}

          <Button
            title="Approve & Save"
            onPress={onApprove}
            disabled={empty || regenerating}
            fullWidth
            icon={<Ionicons name="shield-checkmark" size={17} color="#FFFFFF" />}
            style={styles.approve}
          />
          {empty && <Text style={styles.helper}>Add at least one SOAP section before approving.</Text>}
        </>
      )}

      <Text style={styles.section}>Saved notes ({notes.length})</Text>
      {!notes.length && <Text style={styles.muted}>No clinical notes for {ctx.patient.name.split(' ')[0]} yet.</Text>}
      {notes.map((n) => {
        const open = openNote === n.id;
        return (
          <Pressable
            key={n.id}
            onPress={() => setOpenNote(open ? null : n.id)}
            style={styles.note}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
          >
            <View style={styles.noteHead}>
              <Ionicons name="document-text" size={15} color={colors.primary} />
              <Text style={styles.noteDate}>
                {relativeDayLabel(n.date)} • {n.time}
              </Text>
              <Badge label={n.source} variant={n.source === 'AI Draft' ? 'primary' : n.source === 'Voice' ? 'info' : 'default'} size="sm" />
              <Badge label={n.status} variant={n.status === 'Approved' ? 'success' : 'warning'} size="sm" />
            </View>
            <Text style={styles.noteText} numberOfLines={open ? undefined : 3}>
              {n.content}
            </Text>
            <Text style={styles.noteBy}>
              {n.approvedBy ? `Approved by ${n.approvedBy} at ${n.time}` : `Author: ${n.author}`}
              {open ? '' : '  •  tap to expand'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  bannerTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.warningText,
  },
  bannerSub: {
    fontSize: typography.fontSizes.xs,
    color: colors.warningText,
    marginTop: 2,
    lineHeight: 16,
  },
  originRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  regen: {
    paddingTop: spacing.xs,
  },
  tools: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  tool: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minHeight: 52,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  toolText: {
    fontSize: typography.fontSizes.xs + 0.5,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  insightHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.purpleLight,
  },
  insightHintText: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 0.5,
    color: '#5B21B6',
    lineHeight: 16,
  },
  approve: {
    marginTop: spacing.md,
  },
  helper: {
    fontSize: typography.fontSizes.xs,
    color: colors.danger,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  savedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  savedTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.successText,
  },
  savedSub: {
    fontSize: typography.fontSizes.xs,
    color: colors.successText,
    marginTop: 2,
  },
  section: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  muted: {
    fontSize: typography.fontSizes.sm,
    color: colors.textMuted,
  },
  note: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  noteHead: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  noteDate: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  noteText: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  noteBy: {
    fontSize: typography.fontSizes.xs - 1,
    color: colors.textMuted,
    marginTop: 6,
  },
});
