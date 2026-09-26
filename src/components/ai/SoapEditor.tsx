import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { SOAP_KEYS, SoapNote } from './copilotEngine';

const FIELDS: Record<keyof SoapNote, { label: string; hint: string; color: string }> = {
  S: { label: 'Subjective', hint: 'History, symptoms, patient-reported concerns', color: colors.primary },
  O: { label: 'Objective', hint: 'Vitals, examination, labs & imaging', color: '#0EA5E9' },
  A: { label: 'Assessment', hint: 'Problem list & clinical impression', color: colors.purple },
  P: { label: 'Plan', hint: 'Orders, medication, follow-up', color: colors.success },
};

interface SoapEditorProps {
  value: SoapNote;
  onChange: (key: keyof SoapNote, text: string) => void;
  editable?: boolean;
}

/** Four labelled SOAP sections; each grows with its content. */
export const SoapEditor: React.FC<SoapEditorProps> = ({ value, onChange, editable = true }) => (
  <View style={styles.wrap}>
    {SOAP_KEYS.map((key) => {
      const f = FIELDS[key];
      return (
        <View key={key} style={styles.field}>
          <View style={styles.head}>
            <View style={[styles.letter, { backgroundColor: `${f.color}18` }]}>
              <Text style={[styles.letterText, { color: f.color }]}>{key}</Text>
            </View>
            <Text style={styles.label}>{f.label}</Text>
            {!value[key].trim() && <Text style={styles.emptyTag}>Empty</Text>}
          </View>
          <TextInput
            value={value[key]}
            onChangeText={(t) => onChange(key, t)}
            editable={editable}
            multiline
            placeholder={f.hint}
            placeholderTextColor={colors.textMuted}
            style={[styles.input, !editable && styles.inputReadOnly]}
            textAlignVertical="top"
            accessibilityLabel={`${f.label} section`}
            scrollEnabled={false}
          />
        </View>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  field: {
    gap: 6,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  letter: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.extraBold,
  },
  label: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  emptyTag: {
    fontSize: typography.fontSizes.xs - 1,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.semiBold,
  },
  input: {
    minHeight: 64,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: typography.fontSizes.sm,
    lineHeight: 19,
    color: colors.text,
  },
  inputReadOnly: {
    backgroundColor: colors.cardMuted,
    color: colors.textSecondary,
  },
});
