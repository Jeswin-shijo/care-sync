import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '../../../context/AppContext';
import { useToast } from '../../../context/ToastContext';
import type { Invoice } from '../../../data/mockData';
import type { PaymentMode } from '../../../logic/hospital';
import { INVOICE_PREFIX, nextInvoiceNumber, paymentModeSplit, RECEIPT_HEADING } from '../../../logic/billing';
import { colors, radius, shadows, spacing, typography } from '../../../constants/theme';
import { Button } from '../../common/Button';
import { KeyboardAwareContainer, formScrollProps } from '../../common/KeyboardAware';
import { FadeInView } from '../../common/Motion';
import { formatCurrency } from '../../../utils/formatters';
import { todayISO } from '../../../utils/dates';
import { ChoiceChips } from '../Controls';
import { FormField } from '../FormField';
import { SettingsGroup, SettingsRow, ToggleRow } from '../SettingsRow';
import { useScrollBottomPadding } from '../layout';
import { useHospitalEditAccess, ViewOnlyNotice } from './common';

const GST_SLABS = [
  { value: 0, label: '0% · Exempt' },
  { value: 5, label: '5%' },
  { value: 12, label: '12%' },
  { value: 18, label: '18%' },
];

const MODES: Array<{ mode: PaymentMode; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = [
  { mode: 'UPI', icon: 'qr-code', color: '#7C3AED', bg: '#F5F3FF' },
  { mode: 'Cash', icon: 'cash', color: '#10B981', bg: '#ECFDF5' },
  { mode: 'Card', icon: 'card', color: '#1E6BFF', bg: '#EFF6FF' },
  { mode: 'Net Banking', icon: 'globe', color: '#F59E0B', bg: '#FFFBEB' },
];

const FOOTER_MAX = 120;

export const BillingSection: React.FC = () => {
  const { settings, updateSettings, invoices, hospitalProfile } = useApp();
  const { showToast } = useToast();
  const { canEdit } = useHospitalEditAccess();
  const bottomPad = useScrollBottomPadding();
  const [footer, setFooter] = useState(settings.receiptFooter);
  const [footerTouched, setFooterTouched] = useState(false);

  const split = useMemo(() => paymentModeSplit(invoices, todayISO()), [invoices]);
  const year = new Date().getFullYear();
  const numbering = useMemo(
    () => (Object.keys(INVOICE_PREFIX) as Invoice['type'][]).map((type) => ({ type, heading: RECEIPT_HEADING[type], next: nextInvoiceNumber(invoices, type, year) })),
    [invoices, year]
  );

  const enabledCount = MODES.filter((m) => settings.paymentModes[m.mode]).length;
  const trimmedFooter = footer.trim();
  const footerError = trimmedFooter.length < 5 ? 'Footer must be at least 5 characters.' : null;
  const footerDirty = trimmedFooter !== settings.receiptFooter;

  const setGst = (value: number) => {
    if (value === settings.gstPercent) return;
    updateSettings({ gstPercent: value });
    showToast({ type: 'success', title: `GST set to ${value}%`, message: 'Applies to new invoices. Issued receipts are unchanged.' });
  };

  const toggleMode = (mode: PaymentMode, next: boolean) => {
    if (!next && enabledCount === 1) {
      showToast({ type: 'warning', message: 'Keep at least one payment mode enabled for the billing counter.' });
      return;
    }
    updateSettings({ paymentModes: { ...settings.paymentModes, [mode]: next } });
    showToast({ type: next ? 'success' : 'info', message: `${mode} ${next ? 'enabled' : 'disabled'} at billing counters` });
  };

  const saveFooter = () => {
    setFooterTouched(true);
    if (footerError || !footerDirty) return;
    updateSettings({ receiptFooter: trimmedFooter });
    setFooter(trimmedFooter);
    showToast({ type: 'success', title: 'Receipt footer saved', message: 'New receipts print the updated message.' });
  };

  return (
    <KeyboardAwareContainer>
      <ScrollView {...formScrollProps} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}>
        <ViewOnlyNotice />

        <FadeInView>
          <Text style={styles.groupTitle}>GST on billable services</Text>
          <View style={styles.card}>
            <Text style={styles.cardText}>
              Most clinical services are GST-exempt. Use a slab only for taxable items such as non-ICU rooms above ₹5,000/day.
            </Text>
            <ChoiceChips options={GST_SLABS} value={settings.gstPercent} onChange={setGst} disabled={!canEdit} style={styles.chips} />
          </View>
        </FadeInView>

        <FadeInView delay={60}>
          <SettingsGroup title="Payment modes" caption={`${enabledCount} of ${MODES.length} accepted at billing counters • today's collection shown`}>
            {MODES.map((m) => (
              <ToggleRow
                key={m.mode}
                icon={m.icon}
                iconColor={m.color}
                iconBg={m.bg}
                title={m.mode}
                subtitle={`${formatCurrency(split[m.mode])} collected today`}
                value={settings.paymentModes[m.mode]}
                onValueChange={(v) => toggleMode(m.mode, v)}
                disabled={!canEdit}
              />
            ))}
          </SettingsGroup>
        </FadeInView>

        <FadeInView delay={120}>
          <Text style={styles.groupTitle}>Receipt footer</Text>
          <View style={styles.card}>
            <FormField
              label="Message printed at the bottom of receipts"
              value={footer}
              onChangeText={setFooter}
              onBlur={() => setFooterTouched(true)}
              error={footerTouched ? footerError : null}
              multiline
              maxLength={FOOTER_MAX}
              showCount
              editable={canEdit}
              containerStyle={styles.footerField}
            />
            <View style={styles.footerPreview} accessible accessibilityLabel={`Footer preview: ${trimmedFooter}`}>
              <Text style={styles.footerPreviewText}>“{trimmedFooter || 'Your message'}”</Text>
              <Text style={styles.footerSign}>For {hospitalProfile.name} • Authorized Signatory</Text>
            </View>
            {canEdit && (
              <View style={styles.footerActions}>
                <Button
                  title="Undo"
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    setFooter(settings.receiptFooter);
                    setFooterTouched(false);
                  }}
                  disabled={!footerDirty}
                />
                <Button title="Save footer" size="sm" onPress={saveFooter} disabled={!footerDirty || !!footerError} />
              </View>
            )}
          </View>
        </FadeInView>

        <FadeInView delay={180}>
          <SettingsGroup title="Receipt numbering" caption="Sequential per type and year, so numbers never collide.">
            {numbering.map((n) => (
              <SettingsRow
                key={n.type}
                icon="barcode-outline"
                iconColor="#475569"
                iconBg={colors.cardMuted}
                title={n.heading}
                subtitle={`Next: ${n.next}`}
              />
            ))}
            <SettingsRow
              icon="albums"
              iconColor="#8B5CF6"
              iconBg="#F5F3FF"
              title="Receipt templates"
              subtitle="Preview layouts for every receipt type"
              onPress={() => router.push('/receipt-templates')}
            />
          </SettingsGroup>
        </FadeInView>
      </ScrollView>
    </KeyboardAwareContainer>
  );
};

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  groupTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardText: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  chips: {
    marginTop: spacing.md,
  },
  footerField: {
    marginBottom: spacing.sm,
  },
  footerPreview: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    alignItems: 'center',
  },
  footerPreviewText: {
    fontSize: typography.fontSizes.xs + 1,
    fontStyle: 'italic',
    color: colors.text,
    textAlign: 'center',
  },
  footerSign: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
