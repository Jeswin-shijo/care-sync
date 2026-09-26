import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useApp } from '../../../context/AppContext';
import { useToast } from '../../../context/ToastContext';
import type { HospitalProfile } from '../../../logic/hospital';
import { colors, radius, shadows, spacing, typography } from '../../../constants/theme';
import { Button } from '../../common/Button';
import { BottomActionBar, useBottomBarSpace } from '../../common/BottomActionBar';
import { KeyboardAwareContainer, formScrollProps } from '../../common/KeyboardAware';
import { FadeInView } from '../../common/Motion';
import { FormField } from '../FormField';
import { useScrollBottomPadding } from '../layout';
import { useHospitalEditAccess, ViewOnlyNotice } from './common';
import { normalizeProfile as normalize, PROFILE_FIELDS as FIELDS, validateProfile as validate } from './profileValidation';
import type { ProfileField as Field } from './profileValidation';

export const HospitalProfileSection: React.FC = () => {
  const { hospitalProfile, updateHospitalProfile } = useApp();
  const { showToast } = useToast();
  const { canEdit } = useHospitalEditAccess();
  const navigation = useNavigation();
  const bottomSpace = useBottomBarSpace();
  const bottomPad = useScrollBottomPadding();

  const [form, setForm] = useState<HospitalProfile>(hospitalProfile);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const refs = useRef<Partial<Record<Field, TextInput | null>>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const errors = useMemo(() => validate(form), [form]);
  const normalized = normalize(form);
  const dirty = FIELDS.some((f) => normalized[f] !== hospitalProfile[f]);
  const errorCount = Object.keys(errors).length;

  // Confirm before leaving with unsaved edits (header back, hardware back, swipe gesture).
  usePreventRemove(dirty && canEdit && !saving, ({ data }) => {
    Alert.alert('Discard changes?', 'Your edits to the hospital profile have not been saved.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const set = (field: Field) => (value: string) => setForm((f) => ({ ...f, [field]: field === 'gstin' ? value.toUpperCase() : value }));
  const blur = (field: Field) => () => setTouched((t) => ({ ...t, [field]: true }));
  const errorFor = (field: Field) => ((touched[field] || submitted) && errors[field]) || null;
  const next = (field: Field) => () => {
    const i = FIELDS.indexOf(field);
    const target = FIELDS[i + 1];
    if (target) refs.current[target]?.focus();
  };

  const save = () => {
    if (!canEdit || saving) return;
    setSubmitted(true);
    if (errorCount) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      showToast({ type: 'warning', message: `Fix ${errorCount} field${errorCount === 1 ? '' : 's'} highlighted in red.` });
      return;
    }
    setSaving(true);
    saveTimer.current = setTimeout(() => {
      updateHospitalProfile(normalized);
      setForm(normalized);
      setSaving(false);
      setSubmitted(false);
      setTouched({});
      showToast({ type: 'success', title: 'Hospital profile saved', message: 'Receipts, reports and the dashboard now use these details.' });
    }, 450);
  };

  const reset = () => {
    setForm(hospitalProfile);
    setTouched({});
    setSubmitted(false);
  };

  const field = (
    key: Field,
    label: string,
    props: Partial<React.ComponentProps<typeof FormField>> = {}
  ) => (
    <FormField
      ref={(r) => {
        refs.current[key] = r;
      }}
      label={label}
      value={form[key]}
      onChangeText={set(key)}
      onBlur={blur(key)}
      error={errorFor(key)}
      editable={canEdit && !saving}
      returnKeyType={key === 'regNo' ? 'done' : 'next'}
      onSubmitEditing={key === 'regNo' ? save : next(key)}
      submitBehavior={key === 'regNo' ? 'blurAndSubmit' : 'submit'}
      {...props}
    />
  );

  return (
    <KeyboardAwareContainer>
      <ScrollView
        {...formScrollProps}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: canEdit ? bottomSpace + spacing.lg : bottomPad }]}
      >
        <ViewOnlyNotice />

        {/* Live receipt header preview */}
        <FadeInView>
          <View style={styles.preview} accessible accessibilityLabel={`Receipt header preview: ${normalized.name}, ${normalized.address}, GSTIN ${normalized.gstin}`}>
            <Text style={styles.previewLabel}>RECEIPT HEADER PREVIEW</Text>
            <View style={styles.previewRow}>
              <View style={styles.logo}>
                <Ionicons name="add" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.previewText}>
                <Text style={styles.previewName} numberOfLines={2}>
                  {normalized.name || 'Hospital name'}
                </Text>
                <Text style={styles.previewMeta} numberOfLines={2}>
                  {normalized.address || 'Address'}
                </Text>
                <Text style={styles.previewMeta} numberOfLines={1}>
                  GSTIN: {normalized.gstin || '—'} • {normalized.phone || 'Phone'}
                </Text>
              </View>
            </View>
            <Text style={styles.logoNote}>The CareSync logo prints on every receipt, report and discharge summary.</Text>
          </View>
        </FadeInView>

        <FadeInView delay={80}>
          <Text style={styles.groupTitle}>Identity</Text>
          {field('name', 'Hospital name', { required: true, autoCapitalize: 'words', icon: 'business-outline' })}
          {field('tagline', 'Tagline', { hint: 'Shown under the name on the dashboard banner.', icon: 'chatbubble-ellipses-outline' })}
          {field('address', 'Address', { required: true, multiline: true, icon: 'location-outline', submitBehavior: 'submit' })}

          <Text style={styles.groupTitle}>Contact</Text>
          {field('phone', 'Phone', { required: true, keyboardType: 'phone-pad', icon: 'call-outline' })}
          {field('email', 'Email', { required: true, keyboardType: 'email-address', autoCapitalize: 'none', autoCorrect: false, icon: 'mail-outline' })}
          {field('website', 'Website', { keyboardType: 'url', autoCapitalize: 'none', autoCorrect: false, icon: 'globe-outline' })}

          <Text style={styles.groupTitle}>Registration & tax</Text>
          {field('gstin', 'GSTIN', { required: true, autoCapitalize: 'characters', autoCorrect: false, maxLength: 15, icon: 'document-text-outline', hint: 'Printed on every tax invoice.' })}
          {field('regNo', 'Registration No.', { required: true, autoCapitalize: 'characters', autoCorrect: false, icon: 'ribbon-outline' })}
        </FadeInView>
      </ScrollView>

      {canEdit && (
        <BottomActionBar>
          <View style={styles.actions}>
            <Button title="Reset" variant="outline" onPress={reset} disabled={!dirty || saving} style={styles.resetBtn} />
            <Button
              title={dirty ? 'Save Changes' : 'Saved'}
              onPress={save}
              loading={saving}
              disabled={!dirty || saving}
              style={styles.saveBtn}
              icon={<Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />}
            />
          </View>
        </BottomActionBar>
      )}
    </KeyboardAwareContainer>
  );
};

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
  },
  preview: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  previewRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  logo: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: {
    flex: 1,
    minWidth: 0,
  },
  previewName: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  previewMeta: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  logoNote: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  groupTitle: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  resetBtn: {
    flex: 1,
  },
  saveBtn: {
    flex: 2,
  },
});
