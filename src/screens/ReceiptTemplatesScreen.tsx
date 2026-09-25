import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { RECEIPT_TEMPLATES } from '../data/mockData';
import { Header } from '../components/common/Header';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ReceiptTemplatesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const handleSelectTemplate = (template: typeof RECEIPT_TEMPLATES[0]) => {
    if (template.title === 'Discharge Summary') {
      navigation.navigate('DischargeSummary');
      return;
    }

    // Prepare demo preview data for the template
    let items: Array<{ description: string; qty?: number; rate?: number; amount: number }> = [
      { description: template.title, qty: 1, amount: 500 },
    ];
    let amount = 500;

    if (template.title.includes('OPD')) {
      amount = 800;
      items = [{ description: 'OPD Specialist Consultation', qty: 1, rate: 800, amount: 800 }];
    } else if (template.title.includes('IPD')) {
      amount = 4500;
      items = [
        { description: 'Deluxe Room Advance', qty: 1, rate: 3500, amount: 3500 },
        { description: 'Nursing Admission Charges', qty: 1, rate: 1000, amount: 1000 },
      ];
    } else if (template.title.includes('Pharmacy')) {
      amount = 650;
      items = [
        { description: 'Amoxicillin 500mg (10 Tab)', qty: 1, rate: 45, amount: 45 },
        { description: 'Pantoprazole 40mg (10 Tab)', qty: 1, rate: 35, amount: 35 },
        { description: 'Vitamin D3 Sachet', qty: 4, rate: 60, amount: 240 },
        { description: 'Syrup 100ml', qty: 1, rate: 330, amount: 330 },
      ];
    } else if (template.title.includes('Lab')) {
      amount = 1800;
      items = [
        { description: 'Complete Blood Count (CBC)', qty: 1, amount: 300 },
        { description: 'Liver Function Test (LFT)', qty: 1, amount: 600 },
        { description: 'Kidney Function Test (KFT)', qty: 1, amount: 700 },
        { description: 'Urine Routine Examination', qty: 1, amount: 200 },
      ];
    } else if (template.title.includes('Radiology')) {
      amount = 3500;
      items = [{ description: 'CT Scan (Head Brain Plain)', qty: 1, amount: 3500 }];
    } else if (template.title.includes('Surgery')) {
      amount = 32500;
      items = [
        { description: 'Surgical Procedure OT Charges', qty: 1, amount: 20000 },
        { description: 'Anesthesia & Monitoring', qty: 1, amount: 7500 },
        { description: 'Post-Operative Recovery Room', qty: 1, amount: 5000 },
      ];
    }

    navigation.navigate('ReceiptDetail', {
      receiptData: {
        receiptNo: `REC-2026-${Math.floor(10000 + Math.random() * 90000)}`,
        receiptType: template.title,
        date: '22 Sep 2025',
        time: '10:15 AM',
        patientName: 'Ananya S',
        uhid: 'CC202500125',
        paymentMode: 'UPI',
        amount,
        items,
        doctorName: 'Dr. Priya Menon',
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Receipt Templates" showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.descriptionText}>
          Select any standard receipt template to preview, customize numbering, or generate an instant document.
        </Text>

        <View style={styles.templatesList}>
          {RECEIPT_TEMPLATES.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.templateCard}
              activeOpacity={0.75}
              onPress={() => handleSelectTemplate(item)}
            >
              <View style={[styles.iconWrapper, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>

              <View style={styles.textContainer}>
                <Text style={styles.titleText}>{item.title}</Text>
                <Text style={styles.subtitleText}>{item.subtitle}</Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing.xxl,
  },
  descriptionText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.base,
  },
  templatesList: {
    gap: spacing.sm,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.md,
    ...shadows.sm,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  titleText: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  subtitleText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
