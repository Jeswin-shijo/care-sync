import React, { useState } from 'react';
import { Linking, Platform, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { useToast } from '../../context/ToastContext';
import { PressableScale } from '../common/Motion';
import { ActionMenuSheet } from './ActionMenuSheet';
import { whatsappNumber } from './invoiceUtils';

interface SendToPatientSheetProps {
  visible: boolean;
  onClose: () => void;
  patientName: string;
  phone?: string;
  /** Plain-text message for WhatsApp / SMS / share. */
  message: string;
  /** Renders the PDF and opens the share sheet (pick WhatsApp, Email…). */
  onSendPdf: () => Promise<boolean>;
  documentLabel?: string;
}

/** "Send to patient": the PDF itself, a WhatsApp message to their number, an SMS, or any app. */
export const SendToPatientSheet: React.FC<SendToPatientSheetProps> = ({
  visible,
  onClose,
  patientName,
  phone,
  message,
  onSendPdf,
  documentLabel = 'receipt',
}) => {
  const { showToast } = useToast();
  const [sendingPdf, setSendingPdf] = useState(false);
  const wa = whatsappNumber(phone);
  const text = encodeURIComponent(message);

  const openWhatsApp = async () => {
    if (!wa) return;
    try {
      await Linking.openURL(`whatsapp://send?phone=${wa}&text=${text}`);
    } catch {
      try {
        await Linking.openURL(`https://wa.me/${wa}?text=${text}`);
      } catch {
        showToast({ type: 'warning', title: 'WhatsApp unavailable', message: 'Install WhatsApp or use “More options” to share.' });
      }
    }
  };

  const openSms = async () => {
    if (!phone) return;
    const number = phone.replace(/[^\d+]/g, '');
    const url = Platform.OS === 'ios' ? `sms:${number}&body=${text}` : `sms:${number}?body=${text}`;
    try {
      await Linking.openURL(url);
    } catch {
      showToast({ type: 'warning', title: 'SMS unavailable', message: 'This device cannot send text messages.' });
    }
  };

  const shareText = async () => {
    try {
      const res = await Share.share({ message, title: `${patientName} — ${documentLabel}` });
      if (res.action === Share.sharedAction) {
        showToast({ type: 'success', title: 'Shared', message: `${documentLabel[0].toUpperCase()}${documentLabel.slice(1)} details shared for ${patientName}.` });
      }
    } catch {
      showToast({ type: 'danger', title: 'Could not share', message: 'Please try again.' });
    }
  };

  const sendPdf = async () => {
    if (sendingPdf) return;
    setSendingPdf(true);
    try {
      await onSendPdf();
    } finally {
      setSendingPdf(false);
      onClose();
    }
  };

  return (
    <ActionMenuSheet
      visible={visible}
      onClose={onClose}
      title="Send to Patient"
      subtitle={phone ? `${patientName} • ${phone}` : `${patientName} • no phone on record`}
      actions={[
        {
          key: 'pdf',
          label: `Send ${documentLabel} PDF`,
          description: 'Generates the PDF and opens the share sheet — pick WhatsApp, Email or Drive.',
          icon: 'document-attach-outline',
          onPress: sendPdf,
          loading: sendingPdf,
          keepOpen: true,
        },
        {
          key: 'whatsapp',
          label: 'WhatsApp message',
          description: wa ? `Opens a chat with ${phone} with the ${documentLabel} summary filled in.` : 'No valid mobile number on the patient record.',
          icon: 'logo-whatsapp',
          color: '#16A34A',
          onPress: openWhatsApp,
          disabled: !wa,
        },
        {
          key: 'sms',
          label: 'SMS',
          description: phone ? `Text the ${documentLabel} summary to ${phone}.` : 'No phone number on the patient record.',
          icon: 'chatbubble-ellipses-outline',
          color: '#0EA5E9',
          onPress: openSms,
          disabled: !phone,
        },
        {
          key: 'more',
          label: 'More options…',
          description: 'Share the summary with any app.',
          icon: 'share-social-outline',
          color: colors.textSecondary,
          onPress: shareText,
        },
      ]}
      footerNote="Messages are composed in the patient’s chosen app — nothing is sent until you tap send there."
    />
  );
};

/** Compact card that opens the send sheet, used under documents. */
export const SendToPatientRow: React.FC<{ patientName: string; phone?: string; onPress: () => void }> = ({
  patientName,
  phone,
  onPress,
}) => (
  <PressableScale style={styles.row} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Send to ${patientName}`}>
    <View style={styles.icon}>
      <Ionicons name="paper-plane-outline" size={18} color={colors.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.title}>Send to patient</Text>
      <Text style={styles.sub} numberOfLines={1}>
        {phone ? `${patientName} • ${phone}` : `${patientName} • no phone on record`}
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
  </PressableScale>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  sub: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    marginTop: 1,
  },
});
